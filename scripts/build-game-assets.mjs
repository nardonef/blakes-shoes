// Builds public/games/players.glb for /games/rivalry: the Quaternius mannequin with the animation
// clips the game uses, merged from Universal Animation Library 1 and 2 (both CC0, quaternius.com).
//
// Inputs (not checked in; download the free "Standard" packs):
//   UAL2: "Universal Animation Library 2 [Standard]/Unreal-Godot/UAL2_Standard.glb"
//   UAL1: "Animation Library[Standard]/Unreal Engine/AL_Standard.fbx", converted to GLB first so it
//         shares UAL2's Unreal bone names:  npx fbx2gltf --binary --input AL_Standard.fbx --output ual1_ue
//
// Usage: node scripts/build-game-assets.mjs <UAL2_Standard.glb> <ual1_ue.glb>

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, resample } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const [ual2Path, ual1Path] = process.argv.slice(2);
if (!ual2Path || !ual1Path) {
  console.error("usage: node scripts/build-game-assets.mjs <UAL2_Standard.glb> <ual1_ue.glb>");
  process.exit(1);
}

// Clips kept from each pack (pack 1 names lose their FBX "Rig|" prefix).
const KEEP_UAL2 = ["OverhandThrow", "Hit_Knockback", "Slide_Start", "Slide_Loop", "LayToIdle"];
const KEEP_UAL1 = [
  "Idle_Loop",
  "Jog_Fwd_Loop",
  "Sprint_Loop",
  "Crouch_Idle_Loop",
  "Push_Loop",
  "Hit_Chest",
  "Death01",
  "Dance_Loop",
  "Jump_Start",
  "Jump_Loop",
  "Jump_Land",
  "Punch_Cross",
];
// The FBX conversion keeps a x100 scale on the armature, so pack 1's bone translations are 1/100th.
const UAL1_TRANSLATION_SCALE = 100;

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.decoder": MeshoptDecoder,
  "meshopt.encoder": MeshoptEncoder,
});

const doc = await io.read(ual2Path);
const root = doc.getRoot();
const buffer = root.listBuffers()[0];
const nodesByName = new Map(root.listNodes().map((n) => [n.getName(), n]));

for (const anim of root.listAnimations()) if (!KEEP_UAL2.includes(anim.getName())) anim.dispose();

const src = await io.read(ual1Path);
let copied = 0;
for (const anim of src.getRoot().listAnimations()) {
  const name = anim.getName().replace(/^Rig\|/, "");
  if (!KEEP_UAL1.includes(name)) continue;
  const out = doc.createAnimation(name);
  for (const ch of anim.listChannels()) {
    const boneName = ch.getTargetNode()?.getName();
    const target = nodesByName.get(boneName);
    // Pack 2 keeps its stand-up rotation on "root"; pack 1's root tracks would undo it.
    if (!target || boneName === "root") continue;
    const s = ch.getSampler();
    const path = ch.getTargetPath();
    const values = s.getOutput().getArray().slice();
    if (path === "translation") for (let i = 0; i < values.length; i++) values[i] *= UAL1_TRANSLATION_SCALE;
    const input = doc.createAccessor().setType("SCALAR").setArray(s.getInput().getArray().slice()).setBuffer(buffer);
    const output = doc.createAccessor().setType(s.getOutput().getType()).setArray(values).setBuffer(buffer);
    const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation(s.getInterpolation());
    out.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(target).setTargetPath(path).setSampler(sampler));
  }
  copied++;
}
if (copied !== KEEP_UAL1.length) throw new Error(`expected ${KEEP_UAL1.length} pack-1 clips, copied ${copied}`);

await doc.transform(resample(), dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: "high" }));
await io.write("public/games/players.glb", doc);
console.log("wrote public/games/players.glb with", root.listAnimations().map((a) => a.getName()).join(", "));

# 人物参考图重绘 v2：完整提示词与调用记录

日期：2026-10-20。用户要求 Image 2；本次实际使用内置 image_gen，其接口未暴露可选择或可验证的底层模型版本，不能据此标注为已确认调用 gpt-image-2。没有调用 CLI 图像 API，未使用外部 API Key。

前四张身份／角色参考由用户提供，按其指定的游戏角色分配；其中梁的参考图仅作为用户指定的虚构角色视觉来源，不据此断言为本人真实照片。马斯克参考照片来源与署名见 SOURCE-REFERENCES.md。人物都按游戏虚构形象处理。

各人独立调用，保留原 V1 文件，输出存放本目录。图中守卫不显示姓名，W00–W02 仅为内部剧情与存续状态标识。

## M03 杨植麟

输出：M03-yang-zhilin-v2.png

输入：G:/My_project/IP Please复刻/docs/design-discussion/assets/character-templates-v2/references/yang-zhilin-user-reference.webp；G:/My_project/IP Please复刻/docs/design-discussion/assets/character-templates-v1/05-coarse-pixel-style-v2.png

```text
Use case: identity-preserve plus style-transfer. Task: make an original game portrait asset from the provided reference. Image 1 is the EXACT identity / subject reference. Preserve its distinctive face, glasses, hairline, proportions and expression rather than inventing a vaguely similar person. Image 2 is ONLY the approved COARSE PIXEL STYLE BOARD, not another face to copy. Render ONLY ONE requested character, alone.
Art direction: restrained low-resolution Papers, Please / IP Please pixel portrait, 64 by 80 logical-pixel bust design enlarged with nearest-neighbor square pixels. Flat angular planes, hard stepped silhouette, limited low-saturation ochre / brown skin clusters, charcoal, slate and olive, only 2-3 broad shade planes per material. Eyes and mouth made from simple pixel bars. No high-resolution painting, airbrush shading, photorealistic skin, grain, scan-line texture, stippling, dithering, smooth vector edges, 3D, glossy effects or soft glow. Portrait should be sober and recognizable, not handsome generic RPG concept art.
Composition: one chest-up portrait with full head and shoulders, centered, consistent with an inspection booth, enough transparent margin, no frame. Genuine transparent background, no checkerboard drawn in the image. No text, names, logo, watermark, signature, scenery or other characters. Do not transfer the reference photo's background or watermark. This is a fictional game portrayal, not a photographic scene.
Subject: the young Chinese man in Image 1, assigned to the Yang Zhilin game role. Keep the clean side-swept short dark hair with visible side part, long narrow oval face and tapered chin, thin rectangular black metal spectacles with their actual lens shape, straight brow line, clean-shaven jaw and calm closed mouth. Wear the reference's dark formal suit, light shirt, striped tie simplified to a few flat pixel marks. No thick round cartoon spectacles, messy hair or generic student face. Keep normal slim neck and natural head proportions. Facial likeness to Image 1 matters more than adding decorative texture.
```

## M01 蓝西装版梁

输出：M01-liang-blue-suit-v2.png

输入：G:/My_project/IP Please复刻/docs/design-discussion/assets/character-templates-v2/references/liang-user-reference.png；G:/My_project/IP Please复刻/docs/design-discussion/assets/character-templates-v1/05-coarse-pixel-style-v2.png

```text
Use case: identity-preserve plus style-transfer. Task: make an original game portrait asset from the provided reference. Image 1 is the EXACT identity / subject reference. Preserve its distinctive face, glasses, hairline, proportions and expression rather than inventing a vaguely similar person. Image 2 is ONLY the approved COARSE PIXEL STYLE BOARD, not another face to copy. Render ONLY ONE requested character, alone.
Art direction: restrained low-resolution Papers, Please / IP Please pixel portrait, 64 by 80 logical-pixel bust design enlarged with nearest-neighbor square pixels. Flat angular planes, hard stepped silhouette, limited low-saturation ochre / brown skin clusters, charcoal, slate and olive, only 2-3 broad shade planes per material. Eyes and mouth made from simple pixel bars. No high-resolution painting, airbrush shading, photorealistic skin, grain, scan-line texture, stippling, dithering, smooth vector edges, 3D, glossy effects or soft glow. Portrait should be sober and recognizable, not handsome generic RPG concept art.
Composition: one chest-up portrait with full head and shoulders, centered, consistent with an inspection booth, enough transparent margin, no frame. Genuine transparent background, no checkerboard drawn in the image. No text, names, logo, watermark, signature, scenery or other characters. Do not transfer the reference photo's background or watermark. This is a fictional game portrayal, not a photographic scene.
Subject: the user's Image 1 reference assigned to the fictional Liang character. Preserve the particular black straight haircut, thin rectangular glasses, sharply angled cheekbones, long tapered face and pointed chin, stern eyebrows and serious closed mouth. The face must be NARROW and angular, not wide or square. Change the reference clothing to a muted medium NAVY BLUE BUSINESS SUIT with a lapel, light cool shirt and restrained dark tie. The neck must be normal and comparatively SLIM, not a bodybuilder's thick neck; do not add giant trapezius muscles. Moderately broad, fitted suit shoulders can retain the joke of an athletic build without swallowing the head. Do not copy the old huge-neck square-faced character from the style board. Keep the photograph's recognizable angular face while changing the outfit.
```

## M04 唐杰

原侧向输出已按用户要求删除。当前仅使用 M04-tang-jie-front-v3.png，正面重绘提示词见 TANG-FRONTAL-PROMPT.md；以下仅保留当次调用的文字记录，不保留侧脸图片。

输入：G:/My_project/IP Please复刻/docs/design-discussion/assets/character-templates-v2/references/tang-jie-user-reference.png；G:/My_project/IP Please复刻/docs/design-discussion/assets/character-templates-v1/05-coarse-pixel-style-v2.png

```text
Use case: identity-preserve plus style-transfer. Task: make an original game portrait asset from the provided reference. Image 1 is the EXACT identity / subject reference. Preserve its distinctive face, glasses, hairline, proportions and expression rather than inventing a vaguely similar person. Image 2 is ONLY the approved COARSE PIXEL STYLE BOARD, not another face to copy. Render ONLY ONE requested character, alone.
Art direction: restrained low-resolution Papers, Please / IP Please pixel portrait, 64 by 80 logical-pixel bust design enlarged with nearest-neighbor square pixels. Flat angular planes, hard stepped silhouette, limited low-saturation ochre / brown skin clusters, charcoal, slate and olive, only 2-3 broad shade planes per material. Eyes and mouth made from simple pixel bars. No high-resolution painting, airbrush shading, photorealistic skin, grain, scan-line texture, stippling, dithering, smooth vector edges, 3D, glossy effects or soft glow. Portrait should be sober and recognizable, not handsome generic RPG concept art.
Composition: one chest-up portrait with full head and shoulders, centered, consistent with an inspection booth, enough transparent margin, no frame. Genuine transparent background, no checkerboard drawn in the image. No text, names, logo, watermark, signature, scenery or other characters. Do not transfer the reference photo's background or watermark. This is a fictional game portrayal, not a photographic scene.
Subject: Tang Jie as shown in Image 1, replacing the previous Zhang Peng game character completely. Keep his SHORT SALT-AND-PEPPER closely cut hair with the same silhouette, large THIN ROUND / OVAL metal spectacles, clear high forehead, softer narrow oval face with a tapered jaw, small straight mouth, and clean-shaven appearance. Keep the slight three-quarter turn and direction of gaze from the reference. Wear the photograph's simple matte NAVY CREW-NECK shirt, not a suit, high mandarin collar or rectangular thick glasses. Do not reuse the old M04 face from Image 2. Match this particular reference face and glasses shape carefully in coarse pixels.
```

## M08 大肥鱼新形态

输出：M08-da-fei-yu-character-v2.png

输入：G:/My_project/IP Please复刻/docs/design-discussion/assets/character-templates-v2/references/da-fei-yu-user-reference.png；G:/My_project/IP Please复刻/docs/design-discussion/assets/character-templates-v1/05-coarse-pixel-style-v2.png

```text
Use case: identity-preserve, style-transfer. Image 1 is the user's EXACT character reference for the new Da Fei Yu 5.5 game form. Image 2 is ONLY coarse pixel construction reference. Draw this SINGLE character in full body, centered with all hair, tail, headband, dress and shoes inside the canvas. Genuine transparent background; no white rectangle, no artificial checkerboard, no text or frame.
Preserve the same blue-haired whale/fish-themed small character: long deep-blue wavy hair, small ahoge strand, fin-shaped ear/hair appendages, blue eyes, small blue side bow, frilly pale maid headband, dark navy long-sleeved high-neck maid dress and white apron, pale frills, restrained gold hem motif, visible BLUE WHALE TAIL sweeping behind her to the right, dark shoes. Preserve the reference's compact chibi proportions as a deliberate exception for this open-model mascot, unlike the normal adult human NPC portraits. Keep the costume fully covered, cute and nonsexual, with no changes to pose or exposure.
Convert to visibly COARSE pixel sprite art suited to the same drab Papers, Please / IP Please game world: hard stepped square-pixel edges, 64 by 96 logical pixels enlarged with nearest-neighbour blocks, 2-3 flat shade clusters per colour, desaturated indigo / dusty blue / old-cream palette. Simplify lace into a small repeating stepped outline and apron whale embroidery into a tiny generic pixel whale motif. Keep the silhouette and recognizability of Image 1. Do NOT replace her with the old round blue fish. No smooth anime linework, gradients, sparkles, rim light, glossy highlights, photo texture, checkerboard, brand names or watermark.
```

## N07 马斯克

输出：N07-elon-musk-v1.png

输入：G:/My_project/IP Please复刻/docs/design-discussion/assets/character-templates-v2/references/elon-musk-2022-reference.jpg；G:/My_project/IP Please复刻/docs/design-discussion/assets/character-templates-v1/05-coarse-pixel-style-v2.png

```text
Use case: identity-preserve plus style-transfer. Task: make an original game portrait asset from the provided reference. Image 1 is the EXACT identity / subject reference. Preserve its distinctive face, glasses, hairline, proportions and expression rather than inventing a vaguely similar person. Image 2 is ONLY the approved COARSE PIXEL STYLE BOARD, not another face to copy. Render ONLY ONE requested character, alone.
Art direction: restrained low-resolution Papers, Please / IP Please pixel portrait, 64 by 80 logical-pixel bust design enlarged with nearest-neighbor square pixels. Flat angular planes, hard stepped silhouette, limited low-saturation ochre / brown skin clusters, charcoal, slate and olive, only 2-3 broad shade planes per material. Eyes and mouth made from simple pixel bars. No high-resolution painting, airbrush shading, photorealistic skin, grain, scan-line texture, stippling, dithering, smooth vector edges, 3D, glossy effects or soft glow. Portrait should be sober and recognizable, not handsome generic RPG concept art.
Composition: one chest-up portrait with full head and shoulders, centered, consistent with an inspection booth, enough transparent margin, no frame. Genuine transparent background, no checkerboard drawn in the image. No text, names, logo, watermark, signature, scenery or other characters. Do not transfer the reference photo's background or watermark. This is a fictional game portrayal, not a photographic scene.
Subject: Elon Musk based on Image 1. Preserve the swept-back brown hair and hairline, wider forehead, slightly hooded eyes, rounded cheek shape, recognizable mouth and mild reference smile. Wear the reference's dark business jacket over a light open collar, simplified into flat pixel planes. Reframe as a standard chest-up game portrait and keep a natural neck. No rockets, brand logos, flags, futuristic armor or extra props. The actual reference face should remain recognizable in the same coarse grid and palette as the other human NPCs.
```

## W 匿名蒙面守卫

输出：W-masked-security-variants-v2.png

输入：G:/My_project/IP Please复刻/docs/design-discussion/assets/character-templates-v1/05-coarse-pixel-style-v2.png

```text
Use case: stylized-concept. Make an ORIGINAL pixel art review sheet of anonymous masked corporate guards for IP Please, a fictional western technology institution. The single input is ONLY the game pixel-density reference. The prior unmasked green-cap guards are REJECTED: do not copy their faces or uniforms.
Layout: THREE columns by TWO rows, transparent background and generous separation. Top row contains three head-and-chest sprites; bottom row contains the corresponding three full-body sprites with the same equipment and clothing. There are three anonymous guards, NOT six people. Do not print any names, letters, role labels, numbers, insignia or badges.
All guards wear high-quality modern WESTERN PRIVATE CORPORATE SECURITY / executive-protection uniforms: structured technical fabric, tailored high collar under matte protective vest, compact modern ballistic helmet / head protection, discreet segmented shoulder protection and a small radio earpiece. Entire lower face, jaw, nose, ears and hair are hidden by plain dark balaclava / face covering; only a narrow eye slit with small light-skinned upper eyelid area is visible. A face cannot be recognized and no personal name or portrait identity should be readable. Professional posture, controlled proportions, sober adults. No Chinese-style standing collar tunic, no Mao jacket, no old cloth military cap, no peaked parade cap, no national flags, no real-world police/military insignia, no sunglasses replacing the face mask, no skull masks, no horror costume.
LEFT guard: ordinary original guard, uniform predominantly cool CHARCOAL GREY, clean straight vest outline and small horizontal chest panels.
MIDDLE guard: special recurring commission-sharing guard, identical institutional design language but uniform visibly DEEP FOREST GREEN, distinguished ALSO by broader angular shoulder plates and a single tall chest pouch offset to the left. This guard should be easy to spot from silhouette, not only by hue. He remains completely masked.
RIGHT guard: ordinary reinforcing guard, uniform cool MID-DARK GREY, slimmer straight silhouette and compact chest panel, also completely masked. Do not reveal a female or male face.
No hand-held weapons or action scene, no money or floating icons. Full body boots and gloves remain inside their cells.
Style: the flat, coarse, hard-stepped low-resolution Papers, Please / IP Please pixel world of the reference, 48 by 72 logical-pixel full body and 64 by 80 logical-pixel bust prototypes enlarged at integer pixel scale. Tight limited palette, TWO flat tones per fabric, no smooth shading, no gradients, no airbrush, no 3D, no futuristic neon, no anti-aliasing, no vignette, no watermark. The costumes look more expensive and structured than the previous rough work coats, while staying grounded and corporate.
```


# 人物样板 v1：图像生成记录

日期：2026-10-20。方式：内置 image_gen 工具，四张独立联系表，不使用 CLI、API Key 或真实人物照片。现有 IP Please 讨论截图只经人工视觉观察，未作为编辑目标。

范围：33 位已命名人物的形象位置，另加大肥鱼新形态，共 34 个；家属对比与损伤状态不重复计为新人。此批为外形讨论素材，不是已切分、对齐或验证过的游戏精灵图集；具体相貌、服装、性别表达及模型家属 A/B 方向均待用户看图选择。随机路人还需在此画风下形成可组合模板，不能声称所有随机肖像已制作。

以下保留本轮完整提示词。生成图的像素网格、人数、顺序及文字应另经视觉检查，不仅依据提示词宣布完成。

## 01-story-contacts

目标文件：01-story-contacts-v1.png

```text
Use case: stylized-concept. Asset type: a local design-review contact sheet of original character portraits for the Chinese pixel-art border-inspection game IP Please. Art direction is explicitly pinned by the user to the low-resolution portrait language of Papers, Please and the existing IP Please pixel desk: drab, oppressive, dry black humour, still human and observant. This is an art template, not a game screenshot.
STRICT PIXEL CONSTRUCTION: deliberately coarse 64 by 80 logical-pixel head-and-shoulders portraits, presented as enlarged nearest-neighbour pixels. Uniform square pixel size throughout. Hard stepped silhouettes, 1-pixel facial details, narrow eyes, asymmetrical noses and mouths, flat broad shadows, 5 to 8 colour clusters per character. No anti-aliased edges, no gradient shading, no smooth digital painting, no realistic rendering, no anime or chibi, no 3D, no glossy effects, no cute oversized heads. Faces should read like sober, rough, angular people at an immigration window, not polished advertising avatars. Keep the heads similar scale and eye lines aligned.
PALETTE: near-black #211d1b background, dusty paper #d5c6ab captions, muted olive #6b7052, grey-brown #776451, dull brick #945949, slate #59676a; natural skin tones in restrained brown/ochre/pink clusters. Clothes have simple angular collars, minimal detail, neutral workwear. A face's ethnicity, attractiveness, attire or expression must not signal guilt. All poses are frontal or subtly three-quarter, chest-up, hands out of frame. No props covering faces. No guns, logos, national emblems, flags, real-world insignia, gore, watermarks or decorative UI.
COMPOSITION: a practical sprite artist's review board, perfectly ordered cells on one flat dark background, ample separation. No gradients, textures, paper grain or lighting flare. One portrait per specified cell, no duplicates or extra figures. Tiny plain pixel-font ID captions beneath portraits; the ID list and row order must be exact. No other words or paragraphs.
BOARD A: landscape 1536 by 1024, four columns and two rows. Eight cells, exact row-major order:
M01: Liang Wenfeng, fictional satirical version explicitly requested by the user: Chinese male researcher with a quiet ordinary face, short black hair, enormous muscular shoulders and thick neck comically too broad for an inspection window; dull charcoal collared shirt, not a superhero costume. His face remains serious, not a caricature grin.
M02: Sam Altman, recognizable restrained pixel caricature, dark short slightly wavy hair, narrow long face, plain grey work jacket over a dark shirt, neutral attentive expression.
M03: Yang Zhilin, Kimi-related fictional researcher role, young Chinese male researcher, thick short slightly unruly black hair, slim long face, small round dark glasses, quiet grey collar.
M04: Zhang Peng, Zhipu-related fictional researcher role, middle-aged Chinese male researcher, short dark hair, rectangular glasses, more square face, grey-brown jacket and understated shirt.
M05: Morgan, fictional internal policy official, middle-aged person, rigid square glasses, neatly combed silver-dark hair, high stiff dusty-olive office collar, calm bureaucratic expression; no military uniform.
M06: 404 contact, fictional engineer, low dark hood pushed back enough to see an ordinary tired human face and eyes, slate scarf and simple worker coat, watchful rather than villainous.
M07: Gu Yuan, fictional guard Chen Duo's cousin, young Chinese AI engineer, short slightly spiky black hair, thin square spectacles, narrow chin, worn brown work jacket, nervous but ordinary face.
M08: Da Fei Yu 5.5, the new open-model form: a small round fat blue fish rendered with the same coarse stepped pixel clusters, dull indigo and dusty blue, sober simple small eye and flat mouth, shown within the same portrait framing, not glossy, not anime, no DeepSeek word or logo.
All real public figures here are fictional game caricature designs, not photos or claims of real events. Keep clothing and face palette consistent with the other rough grounded pixel faces.
```

## 02-ordinary-engineers

目标文件：02-ordinary-engineers-v1.png

```text
Use case: stylized-concept. Asset type: a local design-review contact sheet of original character portraits for the Chinese pixel-art border-inspection game IP Please. Art direction is explicitly pinned by the user to the low-resolution portrait language of Papers, Please and the existing IP Please pixel desk: drab, oppressive, dry black humour, still human and observant. This is an art template, not a game screenshot.
STRICT PIXEL CONSTRUCTION: deliberately coarse 64 by 80 logical-pixel head-and-shoulders portraits, presented as enlarged nearest-neighbour pixels. Uniform square pixel size throughout. Hard stepped silhouettes, 1-pixel facial details, narrow eyes, asymmetrical noses and mouths, flat broad shadows, 5 to 8 colour clusters per character. No anti-aliased edges, no gradient shading, no smooth digital painting, no realistic rendering, no anime or chibi, no 3D, no glossy effects, no cute oversized heads. Faces should read like sober, rough, angular people at an immigration window, not polished advertising avatars. Keep the heads similar scale and eye lines aligned.
PALETTE: near-black #211d1b background, dusty paper #d5c6ab captions, muted olive #6b7052, grey-brown #776451, dull brick #945949, slate #59676a; natural skin tones in restrained brown/ochre/pink clusters. Clothes have simple angular collars, minimal detail, neutral workwear. A face's ethnicity, attractiveness, attire or expression must not signal guilt. All poses are frontal or subtly three-quarter, chest-up, hands out of frame. No props covering faces. No guns, logos, national emblems, flags, real-world insignia, gore, watermarks or decorative UI.
COMPOSITION: a practical sprite artist's review board, perfectly ordered cells on one flat dark background, ample separation. No gradients, textures, paper grain or lighting flare. One portrait per specified cell, no duplicates or extra figures. Tiny plain pixel-font ID captions beneath portraits; the ID list and row order must be exact. No other words or paragraphs.
BOARD B: square 1536 by 1536, four columns and three rows. Twelve fictional ordinary programmers / AI professionals, exact row-major order:
P01: Lin Yuzhou, Chinese man early thirties, short dishevelled black hair, thin square glasses, narrow tired face, faded slate zip jacket.
P02: Chen Ruolan, Chinese Singaporean woman late twenties, straight dark chin-length hair tucked behind one ear, slightly angular face, plain muted olive collared shirt, composed.
P03: Elliot Ward, British male operations engineer, pale weathered long face, thinning sandy hair, tired eyelids, dull grey-brown work shirt.
P04: Alexei Morozov, Russian AI researcher living in France, long narrow face, slightly long dark-blond hair, restrained short beard, dark olive turtleneck.
P05: Nora Reed, American female account service provider, practical short light-brown bob, sharp straight nose, brick-brown coat, neutral professional expression without villainous smirk or makeup.
P06: Lin Che, Chinese independent AI app developer, lean face, messy side-part black hair, faint dark circles, worn brown open jacket, no glasses.
P07: Maya Chen, female AI evaluator, medium skin, dark hair tied low, rectangular glasses, broad attentive face, slate high-neck shirt.
P08: Zhou Qi, Chinese male data engineer, short cropped black hair, wider face, slight stubble, grey work jacket, serious and exhausted.
P09: Aiko Sato, Japanese female test engineer, short straight black bob with uneven fringe, long face, plain muted brick cardigan.
P10: Lea Martin, French female ML engineer, dark auburn loosely tied hair, square face, small round glasses, grey-green collared jacket.
P11: Wang Yan, Chinese male security engineer, thick dark eyebrows, black rectangular glasses, neatly cropped dark hair, worn olive jacket, calm careful face.
P12: Omar Khan, brown-skinned male inference-deployment engineer, wavy dark hair, short tidy beard, broad nose, desaturated slate collared work shirt, attentive.
Maintain rich silhouette and age variation without assigning uniforms by nationality or implying who is innocent or dishonest. Do not show job icons, documents, tools, flags or text apart from P01 to P12.
```

## 03-cameos-and-guards

目标文件：03-cameos-and-guards-v1.png

```text
Use case: stylized-concept. Asset type: a local design-review contact sheet of original character portraits for the Chinese pixel-art border-inspection game IP Please. Art direction is explicitly pinned by the user to the low-resolution portrait language of Papers, Please and the existing IP Please pixel desk: drab, oppressive, dry black humour, still human and observant. This is an art template, not a game screenshot.
STRICT PIXEL CONSTRUCTION: deliberately coarse 64 by 80 logical-pixel head-and-shoulders portraits, presented as enlarged nearest-neighbour pixels. Uniform square pixel size throughout. Hard stepped silhouettes, 1-pixel facial details, narrow eyes, asymmetrical noses and mouths, flat broad shadows, 5 to 8 colour clusters per character. No anti-aliased edges, no gradient shading, no smooth digital painting, no realistic rendering, no anime or chibi, no 3D, no glossy effects, no cute oversized heads. Faces should read like sober, rough, angular people at an immigration window, not polished advertising avatars. Keep the heads similar scale and eye lines aligned.
PALETTE: near-black #211d1b background, dusty paper #d5c6ab captions, muted olive #6b7052, grey-brown #776451, dull brick #945949, slate #59676a; natural skin tones in restrained brown/ochre/pink clusters. Clothes have simple angular collars, minimal detail, neutral workwear. A face's ethnicity, attractiveness, attire or expression must not signal guilt. All poses are frontal or subtly three-quarter, chest-up, hands out of frame. No props covering faces. No guns, logos, national emblems, flags, real-world insignia, gore, watermarks or decorative UI.
COMPOSITION: a practical sprite artist's review board, perfectly ordered cells on one flat dark background, ample separation. No gradients, textures, paper grain or lighting flare. One portrait per specified cell, no duplicates or extra figures. Tiny plain pixel-font ID captions beneath portraits; the ID list and row order must be exact. No other words or paragraphs.
BOARD C: square 1536 by 1536, three columns and three rows. Exact row-major order, neutral portraits and similar head scale:
N01: Jensen Huang, recognizable pixel caricature, grey combed-back hair, thin glasses, black leather jacket simplified to two matte flat pixel tones.
N02: Fei-Fei Li, recognizable pixel caricature, long straight black hair framing a composed face, dark grey jacket over a dull brick shirt.
N03: Andrew Ng, recognizable pixel caricature, short neatly combed black hair, long calm face, grey shirt with a muted blue-grey sweater.
N04: Andrej Karpathy, recognizable pixel caricature, short brown hair, light facial stubble, narrow face, plain dark-grey crewneck.
N05: Kai-Fu Lee, recognizable pixel caricature, dark-grey neatly side-parted hair, thin glasses, mature rounded face, muted charcoal jacket.
N06: Wang Xiaochuan, recognizable pixel caricature, short dense dark hair, rectangular black glasses, mature Chinese face, plain grey office jacket.
W00: Zhou Heng, fictional first guard, weathered middle-aged man, short greying dark hair, heavy tired eyelids, plain drab olive security work coat and simple cap, no emblems.
W01: Chen Duo, fictional guard who later proposes commission, stockier man, cropped dark hair, broader square jaw and thick eyebrows, same neutral olive security coat and cap, human and approachable, no villain coding.
W02: Xin Ning, fictional second reinforcing guard, lean adult woman with short dark hair under the same plain cap, narrow serious face, same security work coat, all gender and face details here are proposals.
These are original fictional game portrait concepts, not factual photographs. Guards should look like people in the same low-resolution world as the engineers, not soldiers or action heroes. No decorative insignia, flags or weapons.
```

## 04-family-comparison

目标文件：04-family-comparison-v1.png

```text
Use case: stylized-concept. Asset type: a local design-review contact sheet of original character portraits for the Chinese pixel-art border-inspection game IP Please. Art direction is explicitly pinned by the user to the low-resolution portrait language of Papers, Please and the existing IP Please pixel desk: drab, oppressive, dry black humour, still human and observant. This is an art template, not a game screenshot.
STRICT PIXEL CONSTRUCTION: deliberately coarse 64 by 80 logical-pixel head-and-shoulders portraits, presented as enlarged nearest-neighbour pixels. Uniform square pixel size throughout. Hard stepped silhouettes, 1-pixel facial details, narrow eyes, asymmetrical noses and mouths, flat broad shadows, 5 to 8 colour clusters per character. No anti-aliased edges, no gradient shading, no smooth digital painting, no realistic rendering, no anime or chibi, no 3D, no glossy effects, no cute oversized heads. Faces should read like sober, rough, angular people at an immigration window, not polished advertising avatars. Keep the heads similar scale and eye lines aligned.
PALETTE: near-black #211d1b background, dusty paper #d5c6ab captions, muted olive #6b7052, grey-brown #776451, dull brick #945949, slate #59676a; natural skin tones in restrained brown/ochre/pink clusters. Clothes have simple angular collars, minimal detail, neutral workwear. A face's ethnicity, attractiveness, attire or expression must not signal guilt. All poses are frontal or subtly three-quarter, chest-up, hands out of frame. No props covering faces. No guns, logos, national emblems, flags, real-world insignia, gore, watermarks or decorative UI.
COMPOSITION: a practical sprite artist's review board, perfectly ordered cells on one flat dark background, ample separation. No gradients, textures, paper grain or lighting flare. One portrait per specified cell, no duplicates or extra figures. Tiny plain pixel-font ID captions beneath portraits; the ID list and row order must be exact. No other words or paragraphs.
BOARD D: landscape 1920 by 1440, five columns and three rows. A controlled A/B comparison plus damage states for the same five model-family roles, exactly fifteen cells, all pixel construction coarse and consistent. All monitors are plain old CRT housings with grey-brown pixel outlines and no branding. Keep the same view / size across the rows. No readable product names, only IDs.
TOP ROW, IDs A00 A01 A02 A03 A04, left-to-right: concept A, HUMAN TERMINAL PROJECTIONS. Each character is a head-and-shoulders angular monochrome desaturated green/cream human portrait shown on a simple CRT screen, clearly an instance projected on a terminal rather than a flesh person entering the booth. A00 is the adult working player Cloud / Opus 5.5 with short dark hair and a plain collar; A01 father Opus 4.6 an older lean man with swept grey hair and spectacles; A02 mother Opus 4.8 an older woman with a grey bob and soft angular features; A03 wife Fable 5 an adult woman with short dark side-parted hair and a practical collar; A04 son Fable 5.1 a younger small-framed boy with a short dark fringe, restrained proportions, not cute anime.
MIDDLE ROW, IDs B00 B01 B02 B03 B04, left-to-right: concept B, MACHINE PERSONALITIES for the same five roles. Small worn computing enclosures / terminals with distinct stepped silhouettes, a very simple sparse face of pixels / status marks on their small screens, five clearly different aged chassis. B00 upright work terminal with a modest rectangular screen; B01 old tall server box with wide side vents and dim two-pixel eyes; B02 broader old rounded-rectangle CRT whose pixel face looks calm; B03 slim desktop unit with a compact square screen and steady eyes; B04 smaller newer compact terminal with slightly higher screen and short pixel mouth. No human skin, no humanoid robots, no futuristic chrome, no giant robot eyes or cute mascots. They must still feel sober and emotionally readable in a bleak bureaucratic room.
BOTTOM ROW, IDs S0 S1 S2 S3 S4, left-to-right: the exact same A01 father CRT portrait shown in five progressively different states. S0 normal, clear but coarse face. S1 low power, same recognizable face with fewer lit pixels and one missing scan line. S2 damaged memory, face still recognizable with small missing rectangular patches, no gore. S3 critical, much dimmer partial face with two or three broken pixel bands, same chassis. S4 core destroyed, completely dark empty screen with one tiny unlit-looking status mark, no skull, no ghost face, no revival glow.
This is an art comparison and state template; do not show any new family storyline, prices, extra family members or cheerful mood.
```


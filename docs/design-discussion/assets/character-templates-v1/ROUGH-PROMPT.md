# 粗像素游戏密度样板：追加一次风格校正

方式：内置 image_gen；前四张生成图为人物身份参考，第五张为既有岗亭草图的像素密度参考。未覆盖前四张原图，样板不等于已验证精灵资产。

```text
Use case: style-transfer and compositing for a pixel game art template.
INPUTS: images 1 through 4 are the newly generated character concept boards; preserve the specified characters' identity, silhouette, hair, glasses and clothing concepts from those boards. Image 5 is ONLY the existing project inspection-desk mockup and is the REQUIRED COARSE PIXEL STYLE REFERENCE. Match the actual blocky flat angular portrait in its left booth. Do not copy that existing man's design, and do not include UI or text from the mockup.
TASK: make ONE new landscape 1536 by 1024 review sheet, four columns by two rows, with eight original portraits. These are the target in-game art density, not detailed character illustrations. The prior concept boards are TOO DETAILED. REDRAW them much more crudely and more flatly, in the severe sparse low-resolution Papers, Please portrait idiom of reference 5.
PIXEL RULES: pretend each portrait, including its shoulders, is EXACTLY 32 by 44 pixels before integer nearest-neighbour enlargement. The logical pixels must be large, visibly square, and strictly uniform. Eyebrows and mouths are single flat pixel bars. Eyes are no more than one or two DARK PIXELS each, no irises or highlights. Spectacle lenses are empty flat shapes with simple outlines. Use only THREE solid skin colour patches, one for lit plane, one for shadow, one for a small nose plane, with a single outline colour. Hair uses one solid mass and one highlight patch. Clothing uses only TWO flat tones. No skin texture, no freckles, no fabric folds, no beard micro-hairs, no dithering, no scanline texture, no fine facial modeling, no wrinkles modeled by gradients. Especially no photographic or painted shading hidden under pixel edges. Flat grey-brown, ochre, olive, brick, slate palette from the source desk. A completely flat opaque dark brown background. No vignette, no light halos, no gradients, no texture, no anti-aliasing anywhere. Deliberately ugly honest bureaucratic sprite faces, not handsome detailed RPG portraits, anime, chibi or retro advertising art.
EXACT EIGHT CELLS, row-major:
T01 = M01 Liang from image 1, short black hair and massively wide muscular shoulders, dark flat shirt.
T02 = M02 Sam Altman from image 1, narrow long face and wavy short dark hair, flat grey jacket.
T03 = P01 Lin Yuzhou from image 2, messy dark hair, thin glasses, flat slate jacket.
T04 = P02 Chen Ruolan from image 2, dark bob and flat olive collar.
T05 = W01 Chen Duo from image 3, broad face, plain olive security cap and coat, no insignia.
T06 = N01 Jensen Huang from image 3, swept grey hair, glasses, flat black jacket.
T07 = A01 projected father from image 4, the older man with grey hair and glasses inside a SMALL simple CRT frame; monochrome desaturated green and cream; simplify portrait to the same coarse 32 by 44 whole-sprite grid.
T08 = B01 machine father from image 4, old tall computer enclosure with flat side vent and only a few pixels for eyes and mouth, simplify to same coarse whole-sprite grid, no human head.
Faces should retain normal adult proportions, long/angular faces with small eyes; coarse resolution must not become cute character proportions. All heads share a baseline; busts cropped at chest. Add only the exact pixel captions T01, T02, T03, T04, T05, T06, T07, T08 under the corresponding cells, no other text or logos.
This is one bounded style correction: preserve the identities while making the pixel size much coarser and the shadows FLAT like the original desk reference.
```


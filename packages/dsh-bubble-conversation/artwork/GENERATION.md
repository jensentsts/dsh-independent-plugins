# Generated whale-girl artwork record

## Source and status

An image-generation request was made through the Harness `image_generate` tool on 2026-11-10. The requested subscription provider was `gpt`, requested quality `high`, and requested output 1536×1024. The tool returned one PNG, 2,998,617 bytes, 1536×1024, SHA-256 `2096584fe9db9c0f72f03d751a8527dee376cef2f06268d0a4a99bde14db138a`. Its returned filename timestamp was `2026-11-10T11-10-37-466Z` (2026-11-10 19:10:37 +08:00). The response did not separately report a serving account or confirm a different fallback provider; none is invented here.

This is AI-generated new artwork, not a human illustrator's commission, licensed third-party stock, copied official vendor mark, or a search result. No image reference was supplied. The tool was asked to create original adult characters without existing IP, brand logos, signatures or artist imitation. This statement describes the request and observed output; it does not certify uniqueness, copyright status or trademark clearance. The package's MIT code license does not create rights that the generator did not supply. Generated-art usage remains subject to the applicable provider terms and law; no separate third-party illustration license is asserted.

## Prompt and style

The GPT-Image2 Style Library's `character-design-sheet` template, example case 347, supplied the layout guidance. The full art-direction text is retained in `source-prompt.txt`; the actual submitted condensed prompt is retained in `submitted-prompt.txt`. The desired sheet is a 4-column by 2-row array of eight original adult women in conservative high-collared maritime uniforms, with whale-tail/ocean accessories and distinct palettes. It contains no displayed model names, vendor logos, text or watermarks.

Grid order is DeepSeek cobalt-blue navigator, GPT forest-green researcher, Claude amber writer, Grok graphite operator, GLM violet curator, Kimi jade planner, Gemini periwinkle observer, and Doubao sky-blue coordinator. These are independent display mappings, not official representations or endorsements of those vendors.

## Visual verification and processing

The returned full-size image was inspected directly from the image tool output. It showed eight separated head-and-shoulder portraits, consistent illustration style, the requested palette order, high-collared clothing, original maritime/whale accessories, and no visible text or watermark. The visible characters appear adult; the prompt explicitly required 25+ adults. No live Harness browser rendering has been established by the artwork inspection.

`scripts/prepare-avatars.py` crops each known 384×512 grid cell to a centered 384×384 portrait starting 32 pixels below its top, resizes to 256×256 and encodes WebP quality 88. The eight 256×256 files are 13,310–17,882 bytes each, below the 256 KiB owned-avatar limit. `avatar-manifest.json` records every exact crop, dimension, byte count and SHA-256. Runtime delivery embeds these local WebP bytes into this package's Client artifact instead of loading remote image URLs. The original geometric SVG artwork remains the generic/user/unknown-family fallback.

The bundled-Python command and lead's same-command retry first failed with `PermissionError: [WinError 5]` while creating the package-local `src/client` directory. The cause was not attributed to an ACL or sandbox rule. No ACL or PATH was changed. After the human explicitly approved a command-local system interpreter for avatar processing, the unchanged script succeeded under `a local Python executable`, Python 3.12.0 with already installed Pillow 12.2.0; no dependency was installed. The generated source was copied to `artwork/whale-girls-source.png`, and its SHA-256 matches the tool response.

All eight saved 256×256 crops were opened individually with `read_image` and inspected: faces and distinctive accessories remain clear, with no neighboring grid cell, lettering or watermark. The runtime default selection and exact embedded bytes have automated hash/MIME/size tests. The new avatar artifact still needs the lead's authenticated installed-browser inspection at the actual 28-pixel header size; file inspection and a prior artifact's native-composition pass are not that verification.

# Usage Examples

## Download Lanhu JSON

From the project root:

```bash
node .cursor/skills/lanhu-ui-json-parser/scripts/fetch-lanhu-json.js --url "https://lanhuapp.com/..."
```

This script:

- reads the cookie from `.lanhuConfig`
- extracts `image_id` and `project_id`
- calls the Lanhu API
- saves the design JSON into `.lanhuJson/`

## Analyze A Target Layer

```bash
node .cursor/skills/lanhu-ui-json-parser/scripts/analyze-lanhu-json.js --file ".lanhuJson/SketchJSONURL20260306-120000.json" --layer "国家地区"
```

This script:

- prints the root layer summary
- finds the target layer by exact name first
- shows closest names if no exact match is found
- writes candidate child layers to `containerJson.json`

## Analyze The Latest Downloaded JSON

```bash
node .cursor/skills/lanhu-ui-json-parser/scripts/analyze-lanhu-json.js --layer "矩形备份 2"
```

If `--file` is omitted, the script will search for the latest `SketchJSONURL*` file in `.lanhuJson/` and then in the project root.

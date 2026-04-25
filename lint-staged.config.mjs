export default {
  '**/*.{js,cjs,mjs,ts,tsx,vue}': ['eslint --fix', 'prettier --write'],
  '**/*.{json,jsonc,md,css,less,scss,html,yml,yaml}': ['prettier --write'],
}

name: Update recently played music

on:
  schedule:
    - cron: '0 */3 * * *'   # every 3 hours
  workflow_dispatch:         # lets you trigger it manually from the Actions tab

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Fetch recently played and update music-data.json
        env:
          SPOTIFY_CLIENT_ID: ca46c981f9f54996b08404871f793f51
          SPOTIFY_REFRESH_TOKEN: ${{ secrets.SPOTIFY_REFRESH_TOKEN }}
        run: python3 .github/scripts/update_music.py

      - name: Commit changes if anything moved
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add music-data.json
          git diff --cached --quiet || git commit -m "Update recently played music"
          git push

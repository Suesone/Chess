"""Stream the official CC0 database; stop once each theme has ten candidates."""
import csv,json,subprocess,pathlib
counts={k:0 for k in ['mateIn1','fork','pin','skewer','discoveredAttack','hangingPiece']}
fetch=subprocess.Popen(['curl','-L','--fail','--silent','--show-error','https://database.lichess.org/lichess_db_puzzle.csv.zst'],stdout=subprocess.PIPE)
dec=subprocess.Popen(['zstd','-dc'],stdin=fetch.stdout,stdout=subprocess.PIPE,text=True)
fetch.stdout.close()
selected=[]
try:
 for row in csv.DictReader(dec.stdout):
  themes=row['Themes'].split()
  if not (int(row['Rating'])<=1450 and int(row['Popularity'])>=80 and int(row['NbPlays'])>=100 and len(row['Moves'].split())<=6):continue
  for theme in counts:
   if theme in themes and counts[theme]<10:
    selected.append({'id':row['PuzzleId'],'fen':row['FEN'],'moves':row['Moves'].split(),'theme':theme,'rating':int(row['Rating']),'source':row['GameUrl'],'tags':themes})
    counts[theme]+=1
    break
  if all(n==10 for n in counts.values()):break
finally:
 dec.terminate();fetch.terminate()
pathlib.Path('src/content/puzzles-source.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2))
print(counts)
if len(selected)!=60:raise SystemExit('Expected 60 puzzles')

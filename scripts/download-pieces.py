import urllib.request,pathlib
base='https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/'
for color in 'wb':
 for piece in 'KQRBNP':
  name=color+piece+'.svg'
  pathlib.Path('public/pieces/'+name).write_bytes(urllib.request.urlopen(base+name).read())
print('Downloaded 12 cburnett GPLv2+ SVG pieces')

import os,re,json,sys
root=sys.argv[1]; out=[]
for s in sorted(os.listdir(root)):
  for fn in sorted(os.listdir(os.path.join(root,s))):
    p=os.path.join(root,s,fn); name=fn[:-4]; date=''; cmd=[]; cards={}; sec='main'
    for line in open(p,encoding='utf8'):
      line=line.strip()
      if not line: continue
      if line.startswith('// NAME:'): name=line[8:].strip(); continue
      if line.startswith('// DATE:'): date=line[8:].strip(); continue
      if line.startswith('//'): continue
      if re.match(r'^[A-Za-z ]+$',line): sec=line.lower(); continue
      if sec!='main': continue
      isc=line.startswith('COMMANDER:')
      if isc: line=line[10:].strip()
      m=re.match(r'^(\d+)\s+(.+?)(\s+\[.*)?$',line)
      if not m: print('??',p,line,file=sys.stderr); continue
      n,c=int(m[1]),m[2].strip()
      if isc: cmd.append(c)
      cards[c]=cards.get(c,0)+n
    tot=sum(cards.values())
    out.append({'id':f'{s}/{fn[:-4]}','name':name,'set':s.upper(),'date':date,'commanders':cmd,'cards':cards,'total':tot})
# drop collector's editions identical to base
sig={}; res=[]
for d in sorted(out,key=lambda d:d['date'],reverse=True):
  k=tuple(sorted(d['cards'].items()))
  if k in sig: continue
  sig[k]=1; res.append(d)
names=sorted({c for d in res for c in d['cards']})
idx={n:i for i,n in enumerate(names)}
comp={'names':names,'decks':[{'id':d['id'],'n':d['name'],'s':d['set'],'d':d['date'],'c':[idx[x] for x in d['commanders']],'l':[[idx[c],q] for c,q in d['cards'].items()]} for d in res]}
json.dump(comp,open('precons.json','w'),separators=(',',':'))
from collections import Counter
print(len(out),len(res),len(names),os.path.getsize('precons.json'))
print(Counter(d['total'] for d in res).most_common(6))
print([ (d['name'],d['total']) for d in res if d['total']<99][:10])
print([d['name'] for d in res if not d['commanders']])

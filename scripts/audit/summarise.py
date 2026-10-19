import json,sys
d=json.load(open(sys.argv[1]))
def row(n,s): return f"{n:34s} fps {s['fps']:5} p95 {s['p95']:5} p99 {s['p99']:5} max {s['max']:6} >33ms {s['over33']:3} >50ms {s['over50']:3} LT {s['longTasks']:2}/{s['longTaskMs']:4}ms (max {s['longestTask']}) heap {s['heapMB']}"+(f" calls {s['field']['calls']} tris {s['field']['tris']}" if s.get('field') else '')
S=d['scenarios']
for k,v in S.items():
  print('==',k)
  if 'error' in v: print(v);continue
  if k=='home': print(' load',v['load']);print(' ',row('idle',v['idle']));print(' ',row('scroll',v['scroll']));print(' err',v['errors'])
  if k=='studyEach':
    for i,x in v.items(): print(' ',i,x['status'],'ready',x['readyMs'],'load',x['load']['load'],'xfer',x['load']['transferKB'],'KB');print('   ',row('idle',x['idle']));print('   ',row('scroll',x['scroll']));print('    err',x['errors'])
  if k=='studyToStudy':
    for s in v['steps']: print(' ',s.get('from'),'->',s.get('to'),row('',s) if 'fps' in s else s)
    print('  err',v['errors'])
  if k=='chapterChurn':
    for i,x in v.items(): print(' ',i,x['samples']);print('   ',row('frames',x['frameStats']),x['errors'])
  if k=='routes':
    for i,x in v.items(): print(' ',i,'load',x['load']['load'],'xfer',x['load']['transferKB']);print('   ',row('idle',x['idle']));print('   ',row('scroll',x['scroll']));print('    err',x['errors'])

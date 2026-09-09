"""Fetch the exact 1K CC0 assets referenced by Poly Haven's public asset API."""
import json, urllib.request, concurrent.futures
from pathlib import Path
root = Path(__file__).resolve().parents[1] / 'public' / 'textures'
root.mkdir(parents=True, exist_ok=True)
assets = {'paving':'cobblestone_floor_001','plaster':'painted_plaster_wall','roof':'ceramic_roof_01','wood':'brown_planks_03','grass':'leafy_grass','bark':'tree_bark_03','sky':'green_point_park'}
def get(url):
    req=urllib.request.Request(url, headers={'User-Agent':'Willowbrook local game asset preparation'})
    with urllib.request.urlopen(req, timeout=45) as r: return r.read()
def asset(pair):
    name, slug = pair
    meta=json.loads(get('https://api.polyhaven.com/files/'+slug))
    results=[]
    channels={'Diffuse':'color','nor_gl':'normal','Rough':'roughness'} if name!='sky' else {'hdri':'environment'}
    for source, target in channels.items():
        if source not in meta:
            print('Missing channel',slug,source,list(meta),flush=True); continue
        formats=meta[source]['1k']
        fmt='hdr' if name=='sky' else 'jpg'
        entry=formats.get(fmt)
        if not entry:
            fmt=next(iter(formats));entry=formats[fmt]
        output=root/(name+'-'+target+'.'+fmt)
        if not output.exists() or name in ['plaster','grass']: output.write_bytes(get(entry['url']))
        results.append({'file':output.name,'url':entry['url'],'bytes':output.stat().st_size})
    print(name, 'downloaded',flush=True)
    return {'name':name,'source':'https://polyhaven.com/a/'+slug,'license':'CC0','files':results}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results=list(pool.map(asset,assets.items()))
(root/'credits.json').write_text(json.dumps(results,indent=2))
print('Complete:',sum(f['bytes'] for a in results for f in a['files']),'bytes')

"use strict";
const $=id=>document.getElementById(id), status=t=>{$("atlas-status").textContent=t;};
const states={oh:["Ohio",[-84.82,38.39,-80.52,42.0],476150105],wv:["West Virginia",[-82.65,37.18,-77.72,40.64],225704833],va:["Virginia",[-83.68,36.52,-75.18,39.48],487616532],pa:["Pennsylvania",[-80.53,39.72,-74.69,42.28],479758667],nc:["North Carolina",[-84.33,33.83,-75.45,36.59],504787216]};
const project=new URL("./",location.href), mainURL=new URL("us-overview.geojson",project).href, sourceURL=code=>new URL("packs/us-"+code+".pmtiles",project).href;
const selected=()=>$("pack-select").value;
const attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · <a href="https://protomaps.com">Protomaps</a>';
const glyphs=project.href+"glyphs-{fontstack}-{range}.pbf";
const protocol=new pmtiles.Protocol();maplibregl.addProtocol("pmtiles",protocol.tile);
let dbPromise, shown=null, revision=0, overviewData, map, terrainCoverage, currentDetail;
const toggles={"show-shade":["terrain-shading"],"show-contours":["contour-lines","contour-labels"],"show-trails":["trail-lines","trail-labels","park-fill","park-lines","trail-access","trail-access-labels"]};
const currentToggle=id=>$(id).checked;
const vis=id=>({visibility:currentToggle(id)?"visible":"none"});
function setToggle(id,value){$(id).checked=value;try{localStorage.setItem("omk-public-demo." +id,String(value))}catch{}
 if(map)for(const layer of toggles[id])if(map.getLayer(layer))map.setLayoutProperty(layer,"visibility",value?"visible":"none");
}
const publicURL=f=>new URL(f,project).href;
function outdoor(sources,layers){
 Object.assign(sources,{
   shading:{type:"image",url:publicURL("terrain-shade.png"),coordinates:terrainCoverage.corners},
   contours:{type:"geojson",data:publicURL("terrain-contours.geojson"),attribution:"Terrain: Mapzen / AWS Open Data"},
   recreation:{type:"geojson",data:publicURL("public-recreation.geojson"),attribution:"Recreation: USGS, Greene County GIS &amp; local trail sources"}
 });
 const active=(obj,id)=>({...obj,layout:{...obj.layout,...vis(id)}});
 const kind=value=>["==",["get","kind"],value];
 const a=textLayer("contour-labels","contours",{minzoom:8,filter:["==",["%",["get","elevation"],1000],0]});
 const b=textLayer("trail-labels","recreation",{minzoom:8,filter:kind("trail")});
 const c=textLayer("trail-access-labels","recreation",{minzoom:10,filter:kind("access")});
 layers.push(
  active({id:"park-fill",type:"fill",source:"recreation",minzoom:7,filter:kind("park"),paint:{"fill-color":"#4b8c4f","fill-opacity":.22}},"show-trails"),
  active({id:"terrain-shading",type:"raster",source:"shading",minzoom:4,paint:{"raster-opacity":.62,"raster-fade-duration":0}},"show-shade"),
  active({id:"contour-lines",type:"line",source:"contours",minzoom:6,paint:{"line-color":"#d8a772","line-width":["case",["==",["%",["get","elevation"],1000],0],1.2,.7],"line-opacity":.64}},"show-contours"),
  active({...a,layout:{...a.layout,"symbol-placement":"line","text-size":10},"paint":{...a.paint,"text-color":"#d8a772"}},"show-contours"),
  active({id:"park-lines",type:"line",source:"recreation",minzoom:7,filter:kind("park"),paint:{"line-color":"#8bcc7e","line-opacity":.65,"line-width":1}},"show-trails"),
  active({id:"trail-lines",type:"line",source:"recreation",minzoom:6,filter:kind("trail"),paint:{"line-color":"#76edd9","line-width":["interpolate",["linear"],["zoom"],6,1.15,13,3.5],"line-opacity":.9}},"show-trails"),
  active({...b,layout:{...b.layout,"symbol-placement":"line","text-size":11},"paint":{...b.paint,"text-color":"#9cf9e9"}},"show-trails"),
  active({id:"trail-access",type:"circle",source:"recreation",minzoom:8,filter:kind("access"),paint:{"circle-radius":4,"circle-color":"#bef5a1","circle-stroke-color":"#142d23","circle-stroke-width":1}},"show-trails"),
  active({...c,layout:{...c.layout,"text-anchor":"left","text-offset":[.55,0]},"paint":{...c.paint,"text-color":"#bef5a1"}},"show-trails")
 );
 return {sources,layers};
}
function db(){
 if(!dbPromise)dbPromise=new Promise((yes,no)=>{const req=indexedDB.open("omk-public-demo-atlas",1);req.onupgradeneeded=()=>req.result.createObjectStore("packs");req.onsuccess=()=>yes(req.result);req.onerror=()=>no(req.error);});
 return dbPromise;
}
async function access(mode,act){const d=await db();return new Promise((ok,no)=>{const tx=d.transaction("packs",mode),req=act(tx.objectStore("packs"));tx.oncomplete=()=>ok(req.result);tx.onabort=()=>no(tx.error||Error("Storage not available."));tx.onerror=()=>no(tx.error||req.error);});}
const getPack=c=>access("readonly",s=>s.get(c));
function style(sources,layers){outdoor(sources,layers);AtlasShelters.style(sources,layers,project);AtlasMedical.style(sources,layers,project);return {version:8,sources,glyphs,layers:[{id:"base",type:"background",paint:{"background-color":"#102321"}},...layers]};}
function textLayer(id,source,more={}){return {id,type:"symbol",source,...more,layout:{"text-field":["coalesce",["get","name"],["get","name:en"],""],"text-font":["Noto Sans Regular"],"text-size":12,"text-padding":4},paint:{"text-color":"#edf5ec","text-halo-color":"#102321","text-halo-width":1.5}};}
function national(data){
 return style({us:{type:"geojson",data,attribution:"Natural Earth · U.S. Census TIGERweb"}},[
  {id:"states",source:"us",type:"fill",filter:["==",["get","kind"],"state"],paint:{"fill-color":["case",["==",["get","detail"],true],"#355f41","#213a33"]}},
  {id:"state-lines",source:"us",type:"line",filter:["==",["get","kind"],"state"],paint:{"line-color":"#769083","line-width":1}},
  {id:"interstates",source:"us",type:"line",filter:["==",["get","kind"],"highway"],paint:{"line-color":"#c9a874","line-opacity":.75,"line-width":["interpolate",["linear"],["zoom"],2,.4,7,1.5]}},
  {id:"cities",type:"circle",source:"us",minzoom:3,filter:["==",["get","kind"],"city"],paint:{"circle-radius":2,"circle-color":"#ecf0e8"}},
  textLayer("city-labels","us",{minzoom:4,filter:["==",["get","kind"],"city"]})
 ]);
}
function detail(url,available){
 const l=(id,type,src,paint,filter,minzoom)=>({id,type,source:"detail","source-layer":src,paint,...(filter?{filter}:{}),...(minzoom?{minzoom}:{})});
 const poly=["==",["geometry-type"],"Polygon"],line=["==",["geometry-type"],"LineString"];
 const road=["get","kind"], roadFilter=["match",road,["highway","major_road","minor_road","path"],true,false];
 const layers=[
  l("land","fill","land",{"fill-color":"#213a33"},poly),
  l("landuse","fill","landuse",{"fill-color":"#294b36","fill-opacity":.78},["all",poly,["match",["get","kind"],["park","forest","nature_reserve","wood","grass","recreation_ground"],true,false]]),
  l("water","fill","water",{"fill-color":"#1f566d"},poly),
  l("streams","line","water",{"line-color":"#407e98","line-width":1},line,8),
  l("buildings","fill","buildings",{"fill-color":"#486059","fill-opacity":.72},poly,14),
  l("streets","line","roads",{"line-color":["match",road,"highway","#f0c678","major_road","#bbad8e","path","#85b98b","#8a9d98"],"line-width":["interpolate",["linear"],["zoom"],6,.8,12,1.5,16,3]},roadFilter),
  textLayer("places","detail",{"source-layer":"places",minzoom:5}),
  {...textLayer("road-labels","detail",{"source-layer":"roads",minzoom:12,filter:roadFilter}),layout:{...textLayer("x","detail").layout,"symbol-placement":"line","text-size":11}}
 ].filter(x=>available.has(x["source-layer"]));
 return style({detail:{type:"vector",url:"pmtiles://"+url,attribution}},layers);
}
function rect(b){return [[b[0],b[1]],[b[2],b[3]]];}
const lower=[-124.95,24.35,-66.75,49.65];
function browse(b,name,center){
 revision++;shown=null;currentDetail=null;map.setStyle(national(overviewData));if(center)map.jumpTo(center);else map.fitBounds(rect(b),{padding:24,duration:0,maxZoom:8});status(name);
}
function filePM(file,url){return new pmtiles.PMTiles({getKey:()=>url,getBytes:async(offset,length)=>({data:await file.slice(offset,offset+length).arrayBuffer()})});}
function checkHeader(h,code,bounds){const b=states[code][1],x=(b[0]+b[2])/2,y=(b[1]+b[3])/2;if(h.tileType!==1||h.maxZoom<13||x<bounds[0]||x>bounds[2]||y<bounds[1]||y>bounds[3])throw Error("Choose the high-detail vector PMTiles for the selected state.");}
async function open(code,file){
 const token=++revision, name=states[code][0];status("Opening "+name+" street detail…");
 try{
  if(!file)file=await getPack(code).catch(()=>null);
  const url=file?new URL("imported/us-"+code+".pmtiles",project).href:sourceURL(code);
  const archive=file?filePM(file,url):new pmtiles.PMTiles(url);
  const h=await archive.getHeader(), meta=await archive.getMetadata();
  checkHeader(h,code,[h.minLon,h.minLat,h.maxLon,h.maxLat]);
  const ids=new Set((meta.vector_layers||[]).map(v=>v.id));if(!ids.has("roads"))throw Error("This is not a supported Protomaps state pack.");
  if(token!==revision)return;
  protocol.add(archive);currentDetail=[url,ids];map.setStyle(detail(url,ids));map.fitBounds(rect(states[code][1]),{padding:25,duration:0,maxZoom:9});
  shown=code;status(name+" street detail · "+(file?"stored in this browser":"from the gaming PC")+" · zoom in for local roads.");
 }catch(e){if(token===revision)status(name+" pack not available here. Import its PMTiles file from Files, or open it on the gaming PC.");}
}
async function hint(){
 const code=selected(),s=states[code],file=await getPack(code).catch(()=>null);
 if(code!==selected())return;
 $("pack-note").textContent=s[0]+" · "+Math.round(s[2]/1e6)+" MB reference pack"+(file?" · imported on this device":"");
 $("remove-pack").disabled=!file;
 const entry=catalog.assets?.find(a=>a.code===code);$("pack-download").href=entry?.url||"https://github.com/actionstations-ai/maps/releases";
}
let catalog={};
(async()=>{
 try{
  const [data,terrain]=await Promise.all([fetch(mainURL),fetch(publicURL("terrain-coverage.json"))]);if(!data.ok||!terrain.ok)throw Error("Overview or terrain coverage file unavailable.");
  [overviewData,terrainCoverage]=await Promise.all([data.json(),terrain.json()]);
  for(const id of Object.keys(toggles)){
   try{$(id).checked=localStorage.getItem("omk-public-demo." +id)==="true"}catch{}
   $(id).onchange=()=>setToggle(id,$(id).checked);
  }
  if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
  map=new maplibregl.Map({container:"atlas-map",style:national(overviewData),center:[-97,38],zoom:2.7,maxZoom:18,renderWorldCopies:true,localIdeographFontFamily:"sans-serif"});
  const rebuild=()=>map.setStyle(currentDetail?detail(...currentDetail):national(overviewData));
  AtlasShelters.attach(map,project,rebuild); AtlasMedical.attach(map,project,rebuild);
  map.addControl(new maplibregl.NavigationControl({showCompass:true}),"top-right");
  map.addControl(new maplibregl.ScaleControl({unit:"imperial"}),"bottom-left");
  map.on("error", () => {if(shown&&$("atlas-status").textContent.includes("street detail"))status(states[shown][0]+" detail opened. Some tiles could not load.");});
  map.once("load",()=>{map.fitBounds(rect(lower),{padding:24,duration:0,maxZoom:8});status("U.S. overview · Lower 48. Use Alaska or Hawaii to jump to their maps.");});
  $("us").onclick=()=>browse(lower,"U.S. overview · Lower 48.");
  $("ak").onclick=()=>browse(null,"U.S. overview · Alaska, including the Aleutians.",{center:[-153,62.5],zoom:2.65});
  $("hi").onclick=()=>browse([-160.4,18.75,-154.65,22.35],"U.S. overview · Hawaii.");
  $("jump-beavercreek").onclick=()=>{setToggle("show-trails",true);map.jumpTo({center:[-84.06578,39.73836],zoom:10});status("Beavercreek area · public trails and Greene County park boundaries.");};
  $("jump-appalachia").onclick=()=>{setToggle("show-shade",true);setToggle("show-contours",true);if(shown)browse(null,"Appalachian terrain · 500 ft contours.",{center:[-81.2,37.2],zoom:7.2});else{map.jumpTo({center:[-81.2,37.2],zoom:7.2});status("Appalachian terrain · 500 ft contours.");}};
  $("pack-select").onchange=hint;
  $("open-pack").onclick=()=>open(selected());
  $("pack-file").onchange=async event=>{
   const f=event.target.files?.[0],code=selected();if(!f)return;
   const token=++revision;status("Saving "+states[code][0]+" to this browser…");
   try{
    const a=filePM(f,"validation"),h=await a.getHeader(),meta=await a.getMetadata();
    checkHeader(h,code,[h.minLon,h.minLat,h.maxLon,h.maxLat]);if(!meta.vector_layers?.some(v=>v.id==="roads"))throw Error("A Protomaps vector pack is required.");
    await access("readwrite",s=>s.put(f,code));hint();if(revision===token)await open(code,f);
   }catch(e){if(token===revision)status("Import failed: "+e.message);}finally{event.target.value="";}
  };
  $("remove-pack").onclick=async()=>{const code=selected();try{await access("readwrite",s=>s.delete(code));if(shown===code)browse(lower,"Removed "+states[code][0]+" from this browser.");else status("Removed "+states[code][0]+" from this browser.");hint();}catch(e){status("Could not remove pack.");}};
  fetch(new URL("pack-catalog.json",project)).then(r=>r.ok?r.json():{}).then(c=>{catalog=c;hint();}).catch(hint);
  hint();
 }catch(e){status("Could not open the atlas: "+e.message);}
})();
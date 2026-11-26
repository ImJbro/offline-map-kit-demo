"use strict";
const AtlasMedical=(()=>{
 const checkbox=()=>document.getElementById("medical-pins");
 function style(sources,layers,base){
  if(!checkbox()?.checked)return;
  sources.medical={type:"geojson",data:new URL("medical-facilities.geojson",base).href,cluster:true,clusterRadius:36,clusterMaxZoom:9,attribution:"HIFLD hospital directory · local provider checks"};
  layers.push({id:"medical-locations",type:"circle",source:"medical",paint:{"circle-color":"#dbb6ff","circle-radius":["case",["has","point_count"],["step",["get","point_count"],7,20,10,100,13],5.5],"circle-stroke-width":1.5,"circle-stroke-color":"#232033","circle-opacity":.9}});
 }
 function attach(map,base,rebuild){
  let popup;
  const box=checkbox();box.checked=false;
  box.onchange=()=>{popup?.remove();rebuild();};
  fetch(new URL("medical-facilities-info.json",base)).then(r=>r.json()).then(info=>{
   document.getElementById("medical-coverage").textContent=info.count.toLocaleString()+" mapped public hospital locations across "+info.states+" states and D.C. These are directory records, not live status or wait times. Two Dayton-area entries have a provider-listed emergency department.";
  }).catch(()=>{});
  map.on("click",async e=>{
   if(!map.getLayer("medical-locations"))return;
   const [f]=map.queryRenderedFeatures(e.point,{layers:["medical-locations"]});
   if(!f)return;
   const p=f.properties;
   if(p.cluster){try{const zoom=await map.getSource("medical").getClusterExpansionZoom(p.cluster_id);map.easeTo({center:f.geometry.coordinates,zoom});}catch{}return;}
   const root=document.createElement("div"), title=document.createElement("strong"), addr=document.createElement("div"), note=document.createElement("div");
   title.textContent=p.name;
   addr.textContent=[p.address,[p.city,p.state,p.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
   const type=document.createElement("div");type.textContent=p.type||"Hospital";
   note.textContent=p.ed===true?"Provider lists an emergency department; this map cannot confirm current availability.":"Directory entry; confirm emergency services directly.";
   root.append(title,addr,type,note);
   if(/^\d{10}$/.test(p.phone||"")){const a=document.createElement("a");a.href="tel:+1"+p.phone;a.textContent=p.phone.replace(/^(\d{3})(\d{3})(\d{4})$/,"$1-$2-$3");root.append(a);}
   if(p.ed===true&&/^https:\/\/(ketteringhealth\.org|childrensdayton\.org)\//.test(p.site||"")){const a=document.createElement("a");a.href=p.site;a.textContent="Provider emergency department page";a.style.display="block";root.append(a);}
   popup?.remove();popup=new maplibregl.Popup({maxWidth:"250px",className:"medical-popup"}).setLngLat(f.geometry.coordinates).setDOMContent(root).addTo(map);
  });
 }
 return {style,attach};
})();

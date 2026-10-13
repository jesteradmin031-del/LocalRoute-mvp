export const providers = {
  uber: {id:'uber',name:'Uber',url:'https://m.uber.com/',supportsPrefill:false},
};
export function bookingHandoff(providerId,origin,destination){
  const provider=Object.hasOwn(providers,providerId)?providers[providerId]:null;
  if(!provider || !origin?.name || !destination?.name)return null;
  return {url:provider.url,provider:provider.name,prefilled:false,clipboardText:`${origin.name}, Balasore → ${destination.name}, Balasore`};
}

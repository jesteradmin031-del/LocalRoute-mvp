export function read(key,fallback,validItem=()=>true){
  try{
    const value=JSON.parse(localStorage.getItem(`localroute:${key}`));
    if(Array.isArray(fallback))return Array.isArray(value)?value.filter(validItem):fallback;
    return value!==null&&typeof value===typeof fallback?value:fallback;
  }catch{return fallback;}
}
export function write(key,value){try{localStorage.setItem(`localroute:${key}`,JSON.stringify(value));return true;}catch{return false;}}

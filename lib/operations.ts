const UUID_OR_LONG_ID=/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b|\b[a-zA-Z0-9_-]{20,}\b/gi;

export function normalizeIncidentRoute(value:unknown){
 const raw=typeof value==="string"?value.split(/[?#]/,1)[0]:"";
 if(!raw.startsWith("/dashboard"))return "/dashboard/unknown";
 return raw.replace(UUID_OR_LONG_ID,":id").replace(/\/\d+(?=\/|$)/g,"/:id").slice(0,200);
}

export function normalizeErrorDigest(value:unknown){
 if(typeof value!=="string")return "client-error";
 return value.replace(/[^a-zA-Z0-9_.:-]/g,"").slice(0,128)||"client-error";
}

export function releaseLabel(value:unknown){
 return typeof value==="string"&&value.trim()?value.trim().slice(0,12):"local";
}

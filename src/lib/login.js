import {z} from 'zod';
export const normalizeLogin=value=>typeof value==='string'?value.trim().toLowerCase():'';
export function isValidLogin(value){
 if(typeof value!=='string'||value.length>254)return false;
 return /^[a-z0-9._-]{3,60}$/.test(value)||z.email().safeParse(value).success;
}

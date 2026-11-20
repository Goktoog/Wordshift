import { uid } from './utils.js';

export const sample=[['although','-mesine rağmen','B1'],['despite','-e rağmen','B2'],['therefore','bu nedenle','B1'],['unless','-medikçe','B1'],['whereas','oysa','B2'],['furthermore','ayrıca','B2'],['reduce','azaltmak','A2'],['deteriorate','kötüleşmek','C1']].map(([front,back,level])=>({id:uid(),type:'word',front,back,level,extra:'',options:[],attempts:0,correct:0}));

import {

 collection,
 addDoc,
 getDocs,
 query,
 where,
 deleteDoc,
 doc,
 getDoc

} from "firebase/firestore";

import { db, auth } from "../firebase";



// SAVE ENTRY

export const saveRevenueEntry =
async (data:any)=>{

 const user=auth.currentUser;

 if(!user) return;

 await addDoc(

 collection(db,"revenueEntries"),

 {

 uid:user.uid,

 ...data,

 createdAt:new Date()

 }

 );

};



// LOAD SALES

export const loadRevenueEntries =
async ()=>{

 const user=auth.currentUser;

 if(!user) return [];

 const q=query(

 collection(db,"revenueEntries"),

 where("uid","==",user.uid)

 );

 const snap=await getDocs(q);

 return snap.docs.map(docSnap=>({

 ...docSnap.data(),

 firestoreId:docSnap.id

 }));

};



// MOVE TO TRASH (DELETE)

export const trashRevenueEntry =
async (firestoreId:string)=>{

 const ref=doc(

 db,

 "revenueEntries",

 firestoreId

 );

 const snap=

 await getDoc(ref);

 if(!snap.exists()) return;

 const data=snap.data();

 // add to trash

 await addDoc(

 collection(db,"trashEntries"),

 {

 ...data,

 deletedAt:new Date()

 }

 );

 // remove original

 await deleteDoc(ref);

};



// RESTORE FROM TRASH

export const restoreRevenueEntry=
async (trashDoc:any)=>{

 await addDoc(

 collection(db,"revenueEntries"),

 trashDoc

 );

};
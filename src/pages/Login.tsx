import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import {
  signInWithPopup,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { auth, provider } from "../firebase";

export default function Login() {

  const navigate = useNavigate();

  const [email,setEmail]=useState("");

  const [password,setPassword]=useState("");

  const [strength,setStrength]=useState("");

  const [error,setError]=useState("");

  // PASSWORD STRENGTH

  const checkStrength=(pass:string)=>{

    if(pass.length<8){

      setStrength("Weak");

    }

    else if(!/[A-Z]/.test(pass)){

      setStrength("Medium");

    }

    else{

      setStrength("Strong");

    }

  };


  // EMAIL LOGIN

  const handleSubmit=async(
    e:React.FormEvent
  )=>{

    e.preventDefault();

    setError("");

    try{

      await signInWithEmailAndPassword(

        auth,

        email,

        password

      );

      navigate("/");

    }

    catch(err:any){

      console.error(err);

      setError(

        "Invalid email or password"

      );

    }

  };


  // GOOGLE LOGIN

  const handleGoogleLogin=async()=>{

    try{

      await signInWithPopup(

        auth,

        provider

      );

      navigate("/");

    }

    catch(error){

      console.error(error);

      setError(

        "Google login failed"

      );

    }

  };

  const strengthColors:any={

    Weak:"bg-red-500 w-1/3",

    Medium:"bg-yellow-500 w-2/3",

    Strong:"bg-green-500 w-full",

  };

  return(

<div className="min-h-screen flex items-center justify-center
bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700
p-6">

<div className="relative bg-white/15 backdrop-blur-xl border border-white/30
shadow-2xl rounded-2xl w-full max-w-md p-8">

<h1 className="text-4xl font-extrabold text-center mb-6">

<span className="text-blue-500">

Revenue

</span>

<span className="text-green-500">

Compass

</span>

</h1>

<h2 className="text-xl font-bold text-white mb-6 text-center">

Login to Continue

</h2>


{error &&(

<div className="bg-red-500 text-white text-center py-2 rounded mb-4">

{error}

</div>

)}


<form onSubmit={handleSubmit}>

<input

type="email"

placeholder="Email"

className="w-full p-3 mb-4 rounded-lg bg-white/20 border border-white/30
text-white placeholder-white/70 focus:ring-2 focus:ring-blue-400 outline-none"

value={email}

onChange={(e)=>

setEmail(e.target.value)

}

required

/>


<input

type="password"

placeholder="Password"

className="w-full p-3 mb-2 rounded-lg bg-white/20 border border-white/30
text-white placeholder-white/70 focus:ring-2 focus:ring-blue-400 outline-none"

value={password}

onChange={(e)=>{

setPassword(e.target.value);

checkStrength(e.target.value);

}}

required

/>


{strength &&(

<div className="w-full bg-gray-300 rounded-full h-2 mb-4">

<div

className={`h-2 rounded-full transition-all duration-500

${strengthColors[strength]}

`}

/>

</div>

)}


<button

type="submit"

className="w-full py-3 mt-2 bg-gradient-to-r from-blue-500 to-green-500
text-white rounded-lg font-bold hover:scale-105 transition-transform"

>

Login

</button>

</form>


<div className="flex items-center my-6">

<div className="flex-grow h-px bg-white/30"></div>

<span className="px-4 text-white/70 text-sm">

OR

</span>

<div className="flex-grow h-px bg-white/30"></div>

</div>


<button

onClick={handleGoogleLogin}

className="w-full flex items-center justify-center gap-3 py-3 bg-white
text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"

>

<img

src="/google.jpeg"

alt="Google"

className="w-5 h-5"

/>

Sign in with Google

</button>


<p className="text-center text-white/80 mt-6">

Don’t have an account?{" "}

<Link

to="/signup"

className="text-blue-400 font-semibold hover:underline"

>

Sign up

</Link>

</p>

</div>

</div>

  );

}
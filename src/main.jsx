import React, {useEffect,useState} from "react";
import ReactDOM from "react-dom/client";
import {createClient} from "@supabase/supabase-js";
import "./styles.css";

const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const appPassword=import.meta.env.VITE_APP_PASSWORD||"1234";

if(!url||!key||key.includes("PASTE_YOUR")) throw new Error("Missing Supabase environment variables. Create .env from .env.example.");

const supabase=createClient(url,key);

function App(){
  const [authenticated,setAuthenticated]=useState(()=>{
    return sessionStorage.getItem("lockmate_auth")==="true";
  });
  const [passInput,setPassInput]=useState("");
  const [passError,setPassError]=useState("");

  const [command,setCommand]=useState("ALLOW");
  const [updatedAt,setUpdatedAt]=useState(null);
  const [connected,setConnected]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function loadState(){
    const {data,error}=await supabase.from("lockmate").select("command,updated_at").eq("id","main").single();
    if(error){setMessage(error.message);setConnected(false);return;}
    setCommand(data.command);setUpdatedAt(data.updated_at);setConnected(true);
  }

  useEffect(()=>{
    if(!authenticated) return;
    loadState();
    const channel=supabase.channel("lockmate-pwa")
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"lockmate",filter:"id=eq.main"},payload=>{
        setCommand(payload.new.command);setUpdatedAt(payload.new.updated_at);setMessage("");
      })
      .subscribe(status=>setConnected(status==="SUBSCRIBED"));
    return ()=>{supabase.removeChannel(channel);};
  },[authenticated]);

  function handleUnlock(e){
    e.preventDefault();
    if(passInput===appPassword){
      sessionStorage.setItem("lockmate_auth","true");
      setAuthenticated(true);
      setPassError("");
    }else{
      setPassError("Incorrect password. Please try again.");
      setPassInput("");
    }
  }

  function handleLock(){
    sessionStorage.removeItem("lockmate_auth");
    setAuthenticated(false);
    setPassInput("");
    setPassError("");
  }

  async function setLockState(next){
    if(busy||next===command)return;
    setBusy(true);setMessage("");
    const now=new Date().toISOString();
    const {error}=await supabase.from("lockmate").update({command:next,updated_at:now}).eq("id","main");
    if(error)setMessage(error.message);
    else {setCommand(next);setUpdatedAt(now);}
    setBusy(false);
  }

  const blocked=command==="BLOCK";

  return <main className="app"><section className="shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">⌁</div><div><div className="brand-name">LockMate</div><div className="brand-subtitle">Personal device control</div></div></div>
      <div className="topbar-actions">
        {authenticated&&<div className={"connection "+(connected?"online":"offline")}><span/>{connected?"Connected":"Offline"}</div>}
        {authenticated&&<button className="lock-badge-btn" onClick={handleLock} title="Lock App">🔒</button>}
      </div>
    </header>

    {!authenticated ? (
      <section className="lock-card">
        <div className="lock-icon-wrapper">🔒</div>
        <h2>App Locked</h2>
        <p>Enter password to access LockMate controls</p>
        <form className="lock-form" onSubmit={handleUnlock}>
          <input
            type="password"
            className="lock-input"
            placeholder="Enter Password"
            value={passInput}
            onChange={(e)=>setPassInput(e.target.value)}
            autoFocus
          />
          <button type="submit" className="lock-btn">Unlock App</button>
        </form>
        {passError&&<div className="error">{passError}</div>}
      </section>
    ) : (
      <>
        <section className="device-card">
          <div className="device-icon">▣</div>
          <div className="device-info"><span className="eyebrow">COMPUTER</span><h1>Windows Laptop</h1><p>Account: <strong>Claw</strong></p></div>
          <div className={"state-pill "+(blocked?"blocked":"allowed")}><span/>{blocked?"Blocked":"Allowed"}</div>
        </section>

        <section className="controls">
          <button className={"control block "+(blocked?"active":"")} onClick={()=>setLockState("BLOCK")} disabled={busy}>
            <span className="button-icon">×</span><span><strong>BLOCK</strong><small>Restrict Claw access</small></span>
          </button>
          <button className={"control allow "+(!blocked?"active":"")} onClick={()=>setLockState("ALLOW")} disabled={busy}>
            <span className="button-icon">✓</span><span><strong>ALLOW</strong><small>Restore Claw access</small></span>
          </button>
        </section>

        <section className={"status-panel "+(blocked?"danger":"safe")}><div className="status-dot"/><div>
          <strong>{blocked?"Computer is blocked":"Computer is available"}</strong>
          <p>{blocked?"Claw is currently restricted.":"Claw can use the normal desktop."}</p>
        </div></section>

        {message&&<div className="error">{message}</div>}
        <footer>{updatedAt?`Last command · ${new Date(updatedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`:"Waiting for device state"}</footer>
      </>
    )}
  </section></main>;
}
ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
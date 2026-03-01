const sounds = {
  pop: "/sfx/pop.mp3",
  send: "/sfx/send.mp3",
  join: "/sfx/join.mp3",
  leave: "/sfx/leave.mp3",
  call: "/sfx/call.mp3",
};

export function useSfx(){
  const play = (key, vol=0.35) => {
    try{
      const a = new Audio(sounds[key]);
      a.volume = vol;
      a.play().catch(()=>{});
    }catch(e){}
  };
  return { play };
}
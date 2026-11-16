import numpy as np, wave
SR=44100; D=59.5; N=int(SR*D); t=np.arange(N)/SR
rng=np.random.default_rng(1)
def lp(x, fc):  # one-pole lowpass applied twice
    a=np.exp(-2*np.pi*fc/SR); y=np.empty_like(x); s=0.0
    for _ in range(2):
        # vectorized-ish via cumulative filter in chunks
        y=np.empty_like(x); s=0.0
        for i in range(0,len(x),4096):
            c=x[i:i+4096]; o=np.empty_like(c)
            for j in range(len(c)): s=a*s+(1-a)*c[j]; o[j]=s
            y[i:i+4096]=o
        x=y
    return y
def env(a,b,fi=0.5,fo=0.5):
    e=np.clip((t-a)/max(fi,1e-3),0,1)*np.clip((b-t)/max(fo,1e-3),0,1); return e
def ramp(a,b,v0,v1): return np.where(t<a,v0,np.where(t>b,v1,v0+(v1-v0)*(t-a)/(b-a)))
white=rng.standard_normal(N)
brown=np.cumsum(white); brown-=lp(brown,0.5); brown/=np.abs(brown).max()
print('noise ok')
# ocean: lowpassed noise with swells
ocean=lp(white,600)*(0.6+0.4*np.sin(2*np.pi*t/5.5))*env(0,20,0.2,4)*0.9
# suction 0.4-4: bandish noise sweeping down
sweep=np.sin(2*np.pi*np.cumsum(ramp(0.4,4,900,120))/SR)
suck=lp(white,1500)*env(0.4,4,0.4,1.0)*0.8 + 0.15*sweep*env(0.4,4,0.4,1)
bub=np.zeros(N)
for k in range(40):
    s0=rng.uniform(0.6,4.5); f=rng.uniform(300,900); L=int(0.06*SR); i0=int(s0*SR)
    tt=np.arange(L)/SR; bub[i0:i0+L]+=0.25*np.sin(2*np.pi*(f+tt*3000)*tt)*np.exp(-tt*50)
# shutters
clk=np.zeros(N)
for s0 in [5.3,6.1,6.9,8.2,9.0]:
    i0=int(s0*SR); L=int(0.03*SR); clk[i0:i0+L]+=white[i0:i0+L]*np.exp(-np.arange(L)/SR*150)*0.35
# drone 14-56.5
drone=(np.sin(2*np.pi*55*t)+0.6*np.sin(2*np.pi*55.7*t)+0.3*np.sin(2*np.pi*82.5*t))*env(14,56.5,3,0.2)*0.12
# heartbeat 14-56.5 accelerating
hb=np.zeros(N); x=14.0
while x<56.5:
    bpm=np.interp(x,[14,32,44,56.5],[68,95,120,140])
    for off,amp in [(0,1.0),(0.16,0.7)]:
        i0=int((x+off)*SR); L=int(0.22*SR); tt=np.arange(L)/SR
        if i0+L<N: hb[i0:i0+L]+=amp*np.sin(2*np.pi*(48+20*np.exp(-tt*30))*tt)*np.exp(-tt*18)
    x+=60/bpm
hb*=0.75
# rumble 19.5-44 rising, huge 38-44
rum=brown*ramp(19.5,44,0.05,1.0)*env(19.5,44.2,1,0.15)
rum=rum*np.where(t>38,1.6,1.0)
# whoosh at whip 26
wh=lp(white,2500)*env(25.8,26.9,0.4,0.6)*0.7
# tick tock 44-56.5
tk=np.zeros(N); x=44.2; i=0
while x<56.5:
    i0=int(x*SR); L=int(0.04*SR); tt=np.arange(L)/SR
    tk[i0:i0+L]+=0.45*np.sin(2*np.pi*(2400 if i%2==0 else 1700)*tt)*np.exp(-tt*120); x+=0.5; i+=1
# final boom 56.5
bm=np.zeros(N); i0=int(56.5*SR); L=int(2.5*SR); tt=np.arange(L)/SR
bm[i0:i0+L]=(np.sin(2*np.pi*(70*np.exp(-tt*1.5)+28)*tt)*np.exp(-tt*1.8)+0.4*lp(white[i0:i0+L],300)*np.exp(-tt*3))*1.1
mix=ocean+suck+bub+clk+drone+hb+rum+wh+tk+bm
# total silence 32.0-34.5 (except nothing), smooth
mute=1-np.clip((t-31.85)/0.15,0,1)*np.clip((34.5-t)/0.05,0,1)
mix*=mute
mix/=np.abs(mix).max()*1.05
st=np.stack([mix,mix],1)
with wave.open('sfx.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype('<i2').tobytes())
print('done')

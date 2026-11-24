import numpy as np, wave
SR=44100; D=52.5; N=int(SR*D); t=np.arange(N)/SR; rng=np.random.default_rng(13)
def lp(x,fc): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/fc)**4); return np.fft.irfft(X,len(x))
def bp(x,lo,hi): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=(f>lo)&(f<hi); return np.fft.irfft(X,len(x))
def env(a,b,fi=0.3,fo=0.3): return np.clip((t-a)/fi,0,1)*np.clip((b-t)/fo,0,1)
mix=np.zeros(N)
drone=(np.sin(2*np.pi*55*t)+0.6*np.sin(2*np.pi*55.7*t)+0.3*np.sin(2*np.pi*82.5*t)); mix+=drone*env(0,50,0.5,0.2)*0.12
rum=lp(np.cumsum(rng.standard_normal(N)),70); rum-=lp(rum,2); rum/=np.abs(rum).max(); mix+=rum*np.interp(t,[0,20,34,39,50],[0.25,0.35,0.6,1.0,0.9])*env(0,50,0.5,0.2)
wind=bp(rng.standard_normal(N),200,900); wind/=np.abs(wind).max(); mix+=wind*env(4,29,1,1)*0.25
steps=np.zeros(N); x=4.3
while x<26:
    i=int(x*SR); L=int(0.09*SR); steps[i:i+L]+=lp(rng.standard_normal(L),700)*np.exp(-np.arange(L)/SR*35); x+=0.27
mix+=steps*0.45
i=int(13.5*SR); L=int(0.5*SR); mix[i:i+L]+=lp(rng.standard_normal(L),400)*np.exp(-np.arange(L)/SR*8)*0.9
bell=np.zeros(N)
for s0 in np.arange(19.5,39,1.6):
    i=int(s0*SR); L=int(2.2*SR); tt=np.arange(L)/SR; b=sum(a*np.sin(2*np.pi*f*tt) for f,a in [(220,1),(440,0.5),(587,0.35),(880,0.2)])*np.exp(-tt*1.4); bell[i:i+L]+=b[:max(0,min(L,N-i))]
mix+=bell*0.22*np.interp(t,[19,24,39],[0.6,1,1])
hb=np.zeros(N); x=28.5
while x<50:
    bpm=np.interp(x,[28.5,50],[85,145])
    for off,amp in [(0,1.0),(0.16,0.7)]:
        i=int((x+off)*SR); L=int(0.22*SR); tt=np.arange(L)/SR
        if i+L<N: hb[i:i+L]+=amp*np.sin(2*np.pi*(48+20*np.exp(-tt*30))*tt)*np.exp(-tt*18)
    x+=60/bpm
mix+=hb*0.7
i=int(34.4*SR); L=int(2.0*SR); tt=np.arange(L)/SR; mix[i:i+L]+=0.9*np.sin(2*np.pi*(60*np.exp(-tt*1.2)+30)*tt)*np.exp(-tt*1.6)
x=39.2; k=0
while x<50:
    i=int(x*SR); L=int(0.04*SR); tt=np.arange(L)/SR; mix[i:i+L]+=0.35*np.sin(2*np.pi*(2400 if k%2==0 else 1700)*tt)*np.exp(-tt*120); x+=0.5; k+=1
i=int(50*SR); tt=np.arange(N-i)/SR; mix[i:]+=(np.sin(2*np.pi*(70*np.exp(-tt*1.5)+28)*tt)*np.exp(-tt*1.8))
mix/=np.abs(mix).max()*1.05; st=(np.stack([mix,mix],1)*32767).astype('<i2')
with wave.open('sfx4.wav','wb') as f: f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(st.tobytes())
print('ok')

import numpy as np, wave
SR=44100; D=52; N=int(SR*D); t=np.arange(N)/SR; rng=np.random.default_rng(33)
def lp(x,fc): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/fc)**4); return np.fft.irfft(X,len(x))
def bp(x,lo,hi): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=(f>lo)&(f<hi); return np.fft.irfft(X,len(x))
def env(a,b,fi=0.3,fo=0.3): return np.clip((t-a)/fi,0,1)*np.clip((b-t)/fo,0,1)
mix=np.zeros(N)
# tender piano-like motif for the reveal and the reunion
def note(f,a,dur,amp):
    i=int(a*SR); L=int(dur*SR); tt=np.arange(L)/SR; v=(np.sin(2*np.pi*f*tt)+0.3*np.sin(4*np.pi*f*tt))*np.exp(-tt*2.2)*amp; mix[i:i+min(L,N-i)]+=v[:min(L,N-i)]
for k,(f,a) in enumerate([(392,0.3),(330,1.0),(294,1.7),(330,2.4),(262,3.2)]): note(f,a,2.0,0.18)
for k,(f,a) in enumerate([(392,19.0),(440,19.8),(392,20.6),(330,21.4),(294,22.2),(262,23.0),(330,23.8)]): note(f,a,2.2,0.16)
water=lp(rng.standard_normal(N),600); water/=np.abs(water).max(); mix+=water*(0.25+0.35*np.clip((t-29.5)/7,0,1))*env(0,49.5,1,0.3)
wind=bp(rng.standard_normal(N),200,900); wind/=np.abs(wind).max(); mix+=wind*env(6,49.5,1,0.3)*0.25
steps=np.zeros(N); x=6.0
while x<16:
    i=int(x*SR); L=int(0.09*SR); steps[i:i+L]+=lp(rng.standard_normal(L),700)*np.exp(-np.arange(L)/SR*35); x+=0.28
mix+=steps*0.45
rum=lp(np.cumsum(rng.standard_normal(N)),70); rum-=lp(rum,2); rum/=np.abs(rum).max(); mix+=rum*(env(6,14,1,1)*0.3+env(29.5,49.5,2,0.3)*0.7)
hb=np.zeros(N); x=29.5
while x<49.5:
    bpm=np.interp(x,[29.5,49.5],[90,145])
    for off,amp in [(0,1.0),(0.16,0.7)]:
        i=int((x+off)*SR); L=int(0.22*SR); tt=np.arange(L)/SR
        if i+L<N: hb[i:i+L]+=amp*np.sin(2*np.pi*(48+20*np.exp(-tt*30))*tt)*np.exp(-tt*18)
    x+=60/bpm
mix+=hb*0.7
x=37.2; k=0
while x<49.5:
    i=int(x*SR); L=int(0.04*SR); tt=np.arange(L)/SR; mix[i:i+L]+=0.3*np.sin(2*np.pi*(2400 if k%2==0 else 1700)*tt)*np.exp(-tt*120); x+=0.5; k+=1
i=int(49.5*SR); tt=np.arange(N-i)/SR; mix[i:]+=(np.sin(2*np.pi*(70*np.exp(-tt*1.5)+28)*tt)*np.exp(-tt*1.8))
mix*=1-env(4.6,6.0,0.02,0.02)
mix/=np.abs(mix).max()*1.05; st=(np.stack([mix,mix],1)*32767).astype('<i2')
with wave.open('sfx6.wav','wb') as f: f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(st.tobytes())
print('ok')

import numpy as np, wave
SR=44100; D=53.8; N=int(SR*D); t=np.arange(N)/SR; rng=np.random.default_rng(44)
def lp(x,fc): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/fc)**4); return np.fft.irfft(X,len(x))
def bp(x,lo,hi): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=(f>lo)&(f<hi); return np.fft.irfft(X,len(x))
def env(a,b,fi=0.3,fo=0.3): return np.clip((t-a)/fi,0,1)*np.clip((b-t)/fo,0,1)
mix=np.zeros(N)
water=lp(rng.standard_normal(N),650); water/=np.abs(water).max(); mix+=water*env(0,51.3,0.5,0.3)*0.4*(0.6+0.4*np.sin(2*np.pi*t/4.5))
wind=bp(rng.standard_normal(N),200,900); wind/=np.abs(wind).max(); mix+=wind*env(0,51.3,0.5,0.3)*0.22
splash=np.zeros(N)
for s0 in [0.6,1.8,3.0,7.3,12.8,30.2,31.6]:
    i=int(s0*SR); L=int(0.4*SR); splash[i:i+L]+=lp(rng.standard_normal(L),2200)*np.exp(-np.arange(L)/SR*9)
mix+=splash*0.5
x=15.2
while x<29:
    i=int(x*SR); L=int(0.35*SR); mix[i:i+L]+=lp(rng.standard_normal(L),900)*np.exp(-np.arange(L)/SR*7)*0.35; x+=0.78
creak=np.zeros(N)
for s0 in np.arange(6,51,3.1):
    i=int(s0*SR); L=int(0.25*SR); tt=np.arange(L)/SR; creak[i:i+L]+=np.sin(2*np.pi*(140+60*tt)*tt)*np.exp(-tt*10)*(np.sin(2*np.pi*35*tt)>0)
mix+=creak*0.12
drone=(np.sin(2*np.pi*55*t)+0.6*np.sin(2*np.pi*55.7*t)); mix+=drone*env(29,51.3,2,0.2)*0.12
hb=np.zeros(N); x=29.5
while x<51.3:
    bpm=np.interp(x,[29.5,51.3],[85,140])
    for off,amp in [(0,1.0),(0.16,0.7)]:
        i=int((x+off)*SR); L=int(0.22*SR); tt=np.arange(L)/SR
        if i+L<N: hb[i:i+L]+=amp*np.sin(2*np.pi*(48+20*np.exp(-tt*30))*tt)*np.exp(-tt*18)
    x+=60/bpm
mix+=hb*0.65
x=39.2; k=0
while x<51.3:
    i=int(x*SR); L=int(0.04*SR); tt=np.arange(L)/SR; mix[i:i+L]+=0.3*np.sin(2*np.pi*(2400 if k%2==0 else 1700)*tt)*np.exp(-tt*120); x+=0.5; k+=1
i=int(51.3*SR); tt=np.arange(N-i)/SR; mix[i:]+=(np.sin(2*np.pi*(70*np.exp(-tt*1.5)+28)*tt)*np.exp(-tt*1.8))
mix*=1-env(4.2,5.6,0.02,0.02)
mix/=np.abs(mix).max()*1.05; st=(np.stack([mix,mix],1)*32767).astype('<i2')
with wave.open('sfx7.wav','wb') as f: f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(st.tobytes())
print('ok')

import numpy as np, wave
SR=44100; D=53; N=int(SR*D); t=np.arange(N)/SR; rng=np.random.default_rng(55)
def lp(x,fc): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/fc)**4); return np.fft.irfft(X,len(x))
def bp(x,lo,hi): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=(f>lo)&(f<hi); return np.fft.irfft(X,len(x))
def env(a,b,fi=0.3,fo=0.3): return np.clip((t-a)/fi,0,1)*np.clip((b-t)/fo,0,1)
mix=np.zeros(N)
water=lp(rng.standard_normal(N),650); water/=np.abs(water).max(); mix+=water*(env(0,13,0.3,0.3)*0.5+env(13,50.5,0.5,0.3)*0.12)
wind=bp(rng.standard_normal(N),200,900); wind/=np.abs(wind).max(); mix+=wind*env(0,13,0.3,0.3)*0.3
steps=np.zeros(N); x=0.2
while x<12.4:
    if not (4<=x<5.4):
        i=int(x*SR); L=int(0.09*SR); steps[i:i+L]+=lp(rng.standard_normal(L),700)*np.exp(-np.arange(L)/SR*35)
    x+=0.3
mix+=steps*0.45
i=int(12.6*SR); L=int(0.6*SR); mix[i:i+L]+=lp(rng.standard_normal(L),250)*np.exp(-np.arange(L)/SR*8)*1.0
room=lp(rng.standard_normal(N),300); room/=np.abs(room).max(); mix+=room*env(13,50.5,0.5,0.3)*0.08
def note(f,a,dur,amp):
    i=int(a*SR); L=int(dur*SR); tt=np.arange(L)/SR; v=(np.sin(2*np.pi*f*tt)+0.3*np.sin(4*np.pi*f*tt))*np.exp(-tt*2.2)*amp; mix[i:i+min(L,N-i)]+=v[:min(L,N-i)]
for f,a in [(392,13.8),(440,14.6),(494,15.4),(523,16.2),(494,17.4),(440,18.2),(392,19.0)]: note(f,a,2.2,0.15)
for f,a in [(330,33.0),(294,33.8),(262,34.6)]: note(f,a,2.4,0.14)
drone=(np.sin(2*np.pi*55*t)+0.6*np.sin(2*np.pi*55.7*t)); mix+=drone*env(22,50.5,2,0.2)*0.12
hb=np.zeros(N); x=37
while x<50.5:
    bpm=np.interp(x,[37,50.5],[90,135])
    for off,amp in [(0,1.0),(0.16,0.7)]:
        i=int((x+off)*SR); L=int(0.22*SR); tt=np.arange(L)/SR
        if i+L<N: hb[i:i+L]+=amp*np.sin(2*np.pi*(48+20*np.exp(-tt*30))*tt)*np.exp(-tt*18)
    x+=60/bpm
mix+=hb*0.6
x=37.2; k=0
while x<50.5:
    i=int(x*SR); L=int(0.04*SR); tt=np.arange(L)/SR; mix[i:i+L]+=0.3*np.sin(2*np.pi*(2400 if k%2==0 else 1700)*tt)*np.exp(-tt*120); x+=0.5; k+=1
i=int(50.5*SR); tt=np.arange(N-i)/SR; mix[i:]+=(np.sin(2*np.pi*(70*np.exp(-tt*1.5)+28)*tt)*np.exp(-tt*1.8))
mix*=1-env(4,5.4,0.02,0.02)
mix/=np.abs(mix).max()*1.05; st=(np.stack([mix,mix],1)*32767).astype('<i2')
with wave.open('sfx8.wav','wb') as f: f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(st.tobytes())
print('ok')

import numpy as np, wave
SR=44100; D=56.5; N=int(SR*D); t=np.arange(N)/SR; rng=np.random.default_rng(9)
def lp(x,fc): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/fc)**4); return np.fft.irfft(X,len(x))
def bp(x,lo,hi): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=(f>lo)&(f<hi); return np.fft.irfft(X,len(x))
def env(a,b,fi=0.3,fo=0.3): return np.clip((t-a)/fi,0,1)*np.clip((b-t)/fo,0,1)
nz=lambda: rng.standard_normal(N)
mix=np.zeros(N)
wind=bp(nz(),150,900); wind/=np.abs(wind).max(); mix+=wind*(env(0,4.6)+env(21.5,28.5))*0.35
rum=lp(np.cumsum(nz()),60); rum-=lp(rum,2); rum/=np.abs(rum).max(); mix+=rum*(env(0,4.6)*0.5+env(25,28.5,1,0.3)*0.8+env(38,50.4,1,0.3)*0.5)
hum=0.05*np.sin(2*np.pi*120*t)+0.03*np.sin(2*np.pi*240*t); mix+=hum*env(5.8,9.2,0.2,0.05)
for s0 in [7.7,8.1,8.5,8.9]:
    i=int(s0*SR); L=int(0.05*SR); mix[i:i+L]+=lp(rng.standard_normal(L),3000)*0.5*np.exp(-np.arange(L)/SR*60)
ring=np.sin(2*np.pi*880*t)*(np.sin(2*np.pi*20*t)>0)*((t%2)<1)*0.08; mix+=ring*env(5.8,7.6,0.05,0.05)
alarm=np.sin(2*np.pi*(700+250*np.sign(np.sin(2*np.pi*1.5*t)))*t)*0.08; mix+=alarm*(env(12.4,21.5,0.2,0.2)+env(28.5,50.4,0.5,0.3)*0.5)
x=15.6
while x<21.5:
    i=int(x*SR); L=int(0.12*SR); mix[i:i+L]+=lp(rng.standard_normal(L),900)*0.35*np.exp(-np.arange(L)/SR*30); x+=0.32
hb=np.zeros(N); x=28.5
while x<50.4:
    bpm=np.interp(x,[28.5,50.4],[80,140])
    for off,amp in [(0,1.0),(0.16,0.7)]:
        i=int((x+off)*SR); L=int(0.22*SR); tt=np.arange(L)/SR
        if i+L<N: hb[i:i+L]+=amp*np.sin(2*np.pi*(48+20*np.exp(-tt*30))*tt)*np.exp(-tt*18)
    x+=60/bpm
mix+=hb*0.7
x=38.2; k=0
while x<50.4:
    i=int(x*SR); L=int(0.04*SR); tt=np.arange(L)/SR; mix[i:i+L]+=0.35*np.sin(2*np.pi*(2400 if k%2==0 else 1700)*tt)*np.exp(-tt*120); x+=0.5; k+=1
bell=np.zeros(N)
for s0 in [50.6,52.4]:
    i=int(s0*SR); L=int(2.5*SR); tt=np.arange(L)/SR; b=sum(a*np.sin(2*np.pi*f*tt) for f,a in [(220,1),(440,0.5),(587,0.35),(880,0.2)])*np.exp(-tt*1.3); bell[i:i+L]+=b[:min(L,N-i)]
mix+=bell*0.3
i=int(54*SR); tt=np.arange(N-i)/SR; mix[i:]+=(np.sin(2*np.pi*(70*np.exp(-tt*1.5)+28)*tt)*np.exp(-tt*1.8))
i=int(4.2*SR); L=int(0.6*SR); mix[i:i+L]+=lp(rng.standard_normal(L),2500)*0.5*np.sin(np.pi*np.arange(L)/L)
mix*=1-env(4.6,5.8,0.02,0.02)
mix/=np.abs(mix).max()*1.05; st=(np.stack([mix,mix],1)*32767).astype('<i2')
with wave.open('sfx3.wav','wb') as f: f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(st.tobytes())
print('ok')

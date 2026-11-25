import numpy as np, wave
SR=44100; D=59; N=int(SR*D); t=np.arange(N)/SR; rng=np.random.default_rng(21)
def lp(x,fc): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/fc)**4); return np.fft.irfft(X,len(x))
def bp(x,lo,hi): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=(f>lo)&(f<hi); return np.fft.irfft(X,len(x))
def env(a,b,fi=0.3,fo=0.3): return np.clip((t-a)/fi,0,1)*np.clip((b-t)/fo,0,1)
mix=np.zeros(N)
rum=lp(np.cumsum(rng.standard_normal(N)),70); rum-=lp(rum,2); rum/=np.abs(rum).max()
mix+=rum*(env(0,4.2)*0.9+env(21,32,2,0.5)*np.interp(t,[21,28,31],[0.3,0.9,1.0]))
crash=lp(rng.standard_normal(N),1800); crash/=np.abs(crash).max(); mix+=crash*(env(2.8,4.2,0.1,0.3)*0.8+env(28.4,32,0.05,1.5)*0.9)
wind=bp(rng.standard_normal(N),200,900); wind/=np.abs(wind).max(); mix+=wind*(env(21,56,1,1))*0.3*(0.6+0.4*np.sin(2*np.pi*t/4))
steps=np.zeros(N); x=5.8
while x<21:
    i=int(x*SR); L=int(0.1*SR); steps[i:i+L]+=lp(rng.standard_normal(L),600)*np.exp(-np.arange(L)/SR*30); x+=0.42
mix+=steps*0.5
alarm=np.sin(2*np.pi*(700+250*np.sign(np.sin(2*np.pi*1.5*t)))*t)*0.06; mix+=alarm*env(5.6,21,0.3,0.3)
water=lp(rng.standard_normal(N),700); water/=np.abs(water).max(); mix+=water*env(32,56,1,1)*0.35*(0.6+0.4*np.sin(2*np.pi*t/5))
drone=(np.sin(2*np.pi*55*t)+0.6*np.sin(2*np.pi*55.7*t)); mix+=drone*env(32,56.5,2,0.2)*0.12
x=44.2; k=0
while x<56.5:
    i=int(x*SR); L=int(0.04*SR); tt=np.arange(L)/SR; mix[i:i+L]+=0.3*np.sin(2*np.pi*(2400 if k%2==0 else 1700)*tt)*np.exp(-tt*120); x+=0.5; k+=1
i=int(56.5*SR); tt=np.arange(N-i)/SR; mix[i:]+=(np.sin(2*np.pi*(70*np.exp(-tt*1.5)+28)*tt)*np.exp(-tt*1.8))
mix*=1-env(4.2,5.6,0.02,0.02)
mix/=np.abs(mix).max()*1.05; st=(np.stack([mix,mix],1)*32767).astype('<i2')
with wave.open('sfx5.wav','wb') as f: f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(st.tobytes())
print('ok')

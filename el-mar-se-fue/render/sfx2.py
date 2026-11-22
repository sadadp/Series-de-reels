import numpy as np, wave
SR=44100; D=62.5; N=int(SR*D); t=np.arange(N)/SR; rng=np.random.default_rng(5)
def lp(x,fc): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/fc)**4); return np.fft.irfft(X,len(x))
def bp(x,lo,hi): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=(f>lo)&(f<hi); return np.fft.irfft(X,len(x))
def env(a,b,fi=0.4,fo=0.4): return np.clip((t-a)/fi,0,1)*np.clip((b-t)/fo,0,1)
w=rng.standard_normal(N)
ocean=lp(w,500); ocean/=np.abs(ocean).max(); ocean*= (0.55+0.45*np.sin(2*np.pi*t/6)**2)
mix=ocean*(env(6.3,15,0.3,1.5)*0.55+env(15,24,0.3,3)*0.4)
suck=lp(rng.standard_normal(N),1400); suck/=np.abs(suck).max(); mix+=suck*(env(11,15,0.8,1.0)+env(15.5,19.5,0.5,1.5))*0.45
for s0 in [7.0,9.6,12.4,16.5]:
    i=int(s0*SR); L=int(0.5*SR); tt=np.arange(L)/SR; f=1800+600*np.sin(2*np.pi*3*tt)*np.exp(-tt*3); mix[i:i+L]+=0.22*np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*4)*np.minimum(1,tt*40)
for k in range(30):
    s0=rng.uniform(11.5,20); i=int(s0*SR); L=int(0.06*SR); tt=np.arange(L)/SR; mix[i:i+L]+=0.18*np.sin(2*np.pi*(rng.uniform(300,800)+tt*3000)*tt)*np.exp(-tt*50)
wind=bp(rng.standard_normal(N),200,900); wind/=np.abs(wind).max(); mix+=wind*env(24,48,2,1)*0.25*(0.6+0.4*np.sin(2*np.pi*t/4.3))
drone=(np.sin(2*np.pi*55*t)+0.6*np.sin(2*np.pi*55.7*t)+0.3*np.sin(2*np.pi*82.5*t)); mix+=drone*(env(0,5.2,0.5,0.2)+env(24,60,3,0.2))*0.12
hb=np.zeros(N)
def beats(a,b,b0,b1):
    x=a
    while x<b:
        for off,amp in [(0,1.0),(0.16,0.7)]:
            i=int((x+off)*SR); L=int(0.22*SR); tt=np.arange(L)/SR
            if i+L<N: hb[i:i+L]+=amp*np.sin(2*np.pi*(48+20*np.exp(-tt*30))*tt)*np.exp(-tt*18)
        x+=60/np.interp(x,[a,b],[b0,b1])
beats(0.3,5.0,62,70); beats(32,60,80,140); mix+=hb*0.7
def sweep(a,dur,amp):
    i=int(a*SR); L=int(dur*SR); tt=np.arange(L)/SR; n=lp(rng.standard_normal(L),2500); mix[i:i+L]+=amp*n/np.abs(n).max()*np.sin(np.pi*tt/dur)
sweep(4.6,0.7,0.6); sweep(43.2,0.6,0.5)
i=int(44.0*SR); L=int(2.2*SR); tt=np.arange(L)/SR; mix[i:i+L]+=0.9*(np.sin(2*np.pi*(60*np.exp(-tt*1.2)+30)*tt)*np.exp(-tt*1.6))
x=48.2; k=0
while x<60:
    i=int(x*SR); L=int(0.04*SR); tt=np.arange(L)/SR; mix[i:i+L]+=0.4*np.sin(2*np.pi*(2400 if k%2==0 else 1700)*tt)*np.exp(-tt*120); x+=0.5; k+=1
i=int(60*SR); L=N-i; tt=np.arange(L)/SR; mix[i:]+=(np.sin(2*np.pi*(70*np.exp(-tt*1.5)+28)*tt)*np.exp(-tt*1.8))*1.0
mix*=1-env(5.2,6.3,0.02,0.02)
mix/=np.abs(mix).max()*1.05; st=(np.stack([mix,mix],1)*32767).astype('<i2')
with wave.open('sfx2.wav','wb') as f: f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(st.tobytes())
print('ok')

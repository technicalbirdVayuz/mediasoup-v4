import * as mediasoup from '../';

let worker: mediasoup.types.Worker;
let router: mediasoup.types.Router;
let audioLevelObserver: mediasoup.types.AudioLevelObserver;

const mediaCodecs: mediasoup.types.RtpCodecCapability[] =
[
	{
		kind       : 'audio',
		mimeType   : 'audio/opus',
		clockRate  : 48000,
		channels   : 2,
		parameters :
		{
			useinbandfec : 1,
			foo          : 'bar'
		}
	}
];

beforeAll(async () =>
{
	worker = await mediasoup.createWorker();
	router = await worker.createRouter({ mediaCodecs });
});

afterAll(() => worker.close());

test('router.createAudioLevelObserver() succeeds', async () =>
{
	const onObserverNewRtpObserver = jest.fn();

	router.observer.once('newrtpobserver', onObserverNewRtpObserver);

	audioLevelObserver = await router.createAudioLevelObserver();

	expect(onObserverNewRtpObserver).toHaveBeenCalledTimes(1);
	expect(onObserverNewRtpObserver).toHaveBeenCalledWith(audioLevelObserver);
	expect(typeof audioLevelObserver.id).toBe('string');
	expect(audioLevelObserver.closed).toBe(false);
	expect(audioLevelObserver.paused).toBe(false);
	expect(audioLevelObserver.appData).toEqual({});

	await expect(router.dump())
		.resolves
		.toMatchObject(
			{
				rtpObserverIds : [ audioLevelObserver.id ]
			});
}, 2000);

test('router.createAudioLevelObserver() with wrong arguments rejects with TypeError', async () =>
{
	await expect(router.createAudioLevelObserver({ maxEntries: 0 }))
		.rejects
		.toThrow(TypeError);

	await expect(router.createAudioLevelObserver({ maxEntries: -10 }))
		.rejects
		.toThrow(TypeError);

	// @ts-ignore
	await expect(router.createAudioLevelObserver({ threshold: 'foo' }))
		.rejects
		.toThrow(TypeError);

	// @ts-ignore
	await expect(router.createAudioLevelObserver({ interval: false }))
		.rejects
		.toThrow(TypeError);

	// @ts-ignore
	await expect(router.createAudioLevelObserver({ appData: 'NOT-AN-OBJECT' }))
		.rejects
		.toThrow(TypeError);
}, 2000);

test('audioLevelObserver.pause() and resume() succeed', async () =>
{
	await audioLevelObserver.pause();

	expect(audioLevelObserver.paused).toBe(true);

	await audioLevelObserver.resume();

	expect(audioLevelObserver.paused).toBe(false);
}, 2000);

test('audioLevelObserver.close() succeeds', async () =>
{
	// We need different a AudioLevelObserver instance here.
	const audioLevelObserver2 =
		await router.createAudioLevelObserver({ maxEntries: 8 });

	let dump = await router.dump();

	expect(dump.rtpObserverIds.length).toBe(2);

	audioLevelObserver2.close();

	expect(audioLevelObserver2.closed).toBe(true);

	dump = await router.dump();

	expect(dump.rtpObserverIds.length).toBe(1);

}, 2000);

test('AudioLevelObserver emits "routerclose" if Router is closed', async () =>
{
	// We need different Router and AudioLevelObserver instances here.
	const router2 = await worker.createRouter({ mediaCodecs });
	const audioLevelObserver2 = await router2.createAudioLevelObserver();

	await new Promise<void>((resolve) =>
	{
		audioLevelObserver2.on('routerclose', resolve);
		router2.close();
	});

	expect(audioLevelObserver2.closed).toBe(true);
}, 2000);

test('AudioLevelObserver emits "routerclose" if Worker is closed', async () =>
{
	await new Promise<void>((resolve) =>
	{
		audioLevelObserver.on('routerclose', resolve);
		worker.close();
	});

	expect(audioLevelObserver.closed).toBe(true);
}, 2000);

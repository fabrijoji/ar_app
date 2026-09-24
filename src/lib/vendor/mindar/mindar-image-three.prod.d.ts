import type { Camera, Group, Scene, WebGLRenderer } from 'three';

export class MindARThree {
	constructor(options: {
		container: HTMLElement;
		imageTargetSrc: string;
		maxTrack?: number;
		uiLoading?: string;
		uiScanning?: string;
		uiError?: string;
	});
	renderer: WebGLRenderer;
	scene: Scene;
	camera: Camera;
	cssRenderer: { domElement: HTMLElement };
	start(): Promise<void>;
	stop(): void;
	addAnchor(index: number): {
		group: Group;
		onTargetFound: (() => void) | null;
		onTargetLost: (() => void) | null;
	};
}

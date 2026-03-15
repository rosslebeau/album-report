export interface LastfmTrack {
	readonly name: string;
	readonly artist: {
		readonly '#text': string;
		readonly name?: string;
		readonly mbid: string;
	};
	readonly album: {
		readonly '#text': string;
		readonly mbid: string;
	};
	readonly date?: {
		readonly uts: string;
		readonly '#text': string;
	};
	readonly '@attr'?: {
		readonly nowplaying: string;
	};
}

export interface RecentTracksResponse {
	readonly recenttracks: {
		readonly track: readonly LastfmTrack[];
		readonly '@attr': {
			readonly page: string;
			readonly total: string;
			readonly user: string;
			readonly perPage: string;
			readonly totalPages: string;
		};
	};
}

export interface LastfmAlbumTrack {
	readonly name: string;
	readonly '@attr': {
		readonly rank: string;
	};
	readonly duration: string;
	readonly artist: {
		readonly name: string;
	};
}

export interface LastfmAlbumInfo {
	readonly album: {
		readonly name: string;
		readonly artist: string;
		readonly tracks: {
			readonly track: readonly LastfmAlbumTrack[] | LastfmAlbumTrack;
		};
	};
}

export interface LastfmErrorResponse {
	readonly error: number;
	readonly message: string;
}

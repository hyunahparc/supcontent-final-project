export function mediaPathFromType(mediaType) {
    return mediaType === 'Series' || mediaType === 'tv' ? 'tv' : 'movie';
}

export function mediaTypeFromPath(path) {
    return path === 'tv' ? 'Series' : 'Movie';
}

export function getItemMediaType(item, fallback = 'Movie') {
    return item?.media_type ?? item?.full_data?.media_type ?? fallback;
}

export function mediaHref(item, fallback = 'Movie') {
    const mediaType = getItemMediaType(item, fallback);
    return `/${mediaPathFromType(mediaType)}/${item.external_id}`;
}

export function mediaIdHref(id, mediaType = 'Movie') {
    return `/${mediaPathFromType(mediaType)}/${id}`;
}

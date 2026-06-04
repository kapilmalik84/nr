export default function decorate(block) {
  const link = block.querySelector('a');
  if (!link) return;

  const url = link.href;
  const wrapper = document.createElement('div');
  wrapper.className = 'embed-wrapper';

  if (url.includes('vimeo.com')) {
    const videoId = url.match(/vimeo\.com\/(\d+)/);
    if (videoId) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://player.vimeo.com/video/${videoId[1]}`;
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('title', 'Video');
      wrapper.append(iframe);
    }
  } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (videoId) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId[1]}`;
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('title', 'Video');
      wrapper.append(iframe);
    }
  } else {
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', '');
    wrapper.append(iframe);
  }

  const downloadLink = block.querySelectorAll('a')[1];
  if (downloadLink) {
    const dl = document.createElement('p');
    dl.className = 'embed-download';
    const a = document.createElement('a');
    a.href = downloadLink.href;
    a.textContent = downloadLink.textContent || 'Download video';
    a.target = '_blank';
    a.rel = 'noopener';
    dl.append(a);
    wrapper.append(dl);
  }

  block.textContent = '';
  block.append(wrapper);
}

export const fetcher = (url, options = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('lab_auth_token') : null;
  const headers = { ...options.headers };

  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers }).then((res) => {
    if (!res.ok) {
      throw new Error('Đã xảy ra lỗi khi tải dữ liệu');
    }
    return res.json();
  });
};

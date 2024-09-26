export const fetchTurtle = async () => {
    const response = await fetch('http://localhost:3000/turtle', {
        method: 'POST',
        timeout: 30000
    });
    const data = await response.json();
    return data;
}


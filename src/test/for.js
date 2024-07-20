for (let i = 0; i < 10; i++) {
    await wait();
    console.log(i);
}

//等待10s异步函数
function wait() {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, 2000);
    });
}
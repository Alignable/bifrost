function sleep(timeout: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, timeout);
  });
}
const onBeforeRender = async () => {
  await sleep(500);
  return {
    pageContext: {},
  };
};

export default onBeforeRender;

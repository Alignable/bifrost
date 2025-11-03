const onBeforeRender = () => {
  return {
    pageContext: { layoutProps: { currentNav: "INSERTED BY ONBEFORERENDER" } },
  };
};

export default onBeforeRender;

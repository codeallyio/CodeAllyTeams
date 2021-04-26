const asyncMap = async (array, callback) => {
  return await Promise.all(
    array.map(
      async (element, index, array) => await callback(element, index, array)
    )
  );
};

module.exports = {
  asyncMap,
};

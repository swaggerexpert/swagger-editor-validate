const shouldIgnoreError = (error) => {
  if (error.lineNo === 2) {
    if (
      /should NOT have additional properties\s*additionalProperty: contact1/gm.test(
        error.message
      )
    ) {
      return true;
    }
  }

  return false;
};

module.exports = shouldIgnoreError;

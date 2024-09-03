// create token and saving that in cookies
const sendShopToken = (shop, statusCode, res) => {
  const token = shop.getJwtToken();
  console.log('token',token)

  // Options for cookies
  const options = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: "none",
    secure: true,
  };

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    shop,
    token,
  });
};

module.exports = sendShopToken;

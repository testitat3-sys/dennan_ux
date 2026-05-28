const consumerKey = "F9pv3PqMmF6wqeXmlaF6rSQ0T6rOZgg3";
const consumerSecret = "UELQEZzyrhfSQhv6Savqu1QG16Y=";
const baseUrl = "https://cybqa.pesapal.com/pesapalv3/api";

async function test() {
  console.log("Fetching token...");
  const authRes = await fetch(`${baseUrl}/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
  });
  
  if (!authRes.ok) {
    console.error("Auth failed", await authRes.text());
    return;
  }
  
  const data = await authRes.json();
  console.log("Auth data:", data);
  const token = data.token;
  if (!token) {
     console.log("No token in response");
     return;
  }
  console.log("Token:", token.substring(0, 10) + "...");

  console.log("Registering IPN...");
  const ipnRes = await fetch(`${baseUrl}/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: "https://rightful-spaniel-723.convex.site/api/pesapal/ipn",
      ipn_notification_type: "POST",
    }),
  });

  const text = await ipnRes.text();
  console.log("IPN Status:", ipnRes.status);
  console.log("IPN Response:", text);
}

test();

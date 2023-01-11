import requests

# email addresses not ending in @code.berlin or not
# both registered and confirmed at https://wg-gesucht.de will get rejected
EMAIL = "linus.bolls@gmail.com"
PASSWORD = "hB&WZp$4LWWPFh"

FLATFINDER_URL = "https://flatfinder.bolls.dev/v1"

GET_PARAMS = dict(
    email=EMAIL,
    password=PASSWORD,
)
get_res = requests.get(url=FLATFINDER_URL + "/listings", params=GET_PARAMS)

data = get_res.json()

if data["ok"] != 1:
    print("GET /listings response not ok")

    raise

listings = data["data"]

for listing in listings:

    if not listing["userHasApplied"]:  # listing["location"]["city"] is "Berlin"

        if "german" in listing["languages"]:

            application = f"""
moin {listing["publisher"]["name"]["recommended"]},
{listing}
            """

        else:

            application = f"""
hi {listing["publisher"]["name"]["recommended"]},
{listing}
            """

        POST_PARAMS = dict(
            email=EMAIL,
            password=PASSWORD,
            listingId=listing["id"],
            text=application,
        )
        POST_PARAMS = {
            "email": EMAIL,
            "password": PASSWORD,
            "listingId": listing["id"],
            "text": application,
        }
        post_res = requests.post(
            url=FLATFINDER_URL + "/notes", json=POST_PARAMS)

        listing_url = listing["url"]

        print(f"applied to {listing_url}")

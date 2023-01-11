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
    print(f"error: GET {FLATFINDER_URL}/listings response not ok")

    raise

listings = data["data"]

for listing in listings:

    if not listing["userHasApplied"]:  # listing["location"]["city"] is "Berlin"

        codeword = listing["codeword"]

        if "german" in listing["languages"]:

            application = f"""
Moin {listing["publisher"]["name"]["recommended"]},

{f"Codewort: {codeword} ;)\n" if codeword is not None else ""}
Ein Freund und ich sind interessiert an dem Angebot,
{listing}
            """

        else:

            application = f"""
Hi {listing["publisher"]["name"]["recommended"]},
{listing}
            """

        POST_NOTE_PARAMS = {
            "email": EMAIL,
            "password": PASSWORD,
            "listingId": listing["id"],
            "text": application,
        }
        post_res = requests.post(
            url=FLATFINDER_URL + "/notes",
            json=POST_NOTE_PARAMS,
        )

        # POST_APPLICATION_PARAMS = {
        #     "email": EMAIL,
        #     "password": PASSWORD,
        #     "listingId": listing["id"],
        #     "messages": [application],
        #     "attachedListingId": "9815570",
        # }
        # post_res = requests.post(
        #     url=FLATFINDER_URL + "/applications",
        #     json=POST_APPLICATION_PARAMS,
        # )

        listing_url = listing["url"]

        if post_res.status is 201:
            print(f"applied to {listing_url}")

        if post_res.status is 200:
            print(
                f"did not apply to {listing_url} because there is an existing conversation")

from time import sleep

import requests
from playsound import playsound

puppet_accounts = [
    {
        "email": "ngkf44@gmail.com",
        "password": "8eRuxBnVSUW85aP",
    },
]

# email addresses not ending in @code.berlin or not
# both registered and confirmed at https://wg-gesucht.de will get rejected
ACTIVE_EMAIL = "linus.bolls@gmail.com"
ACTIVE_PASSWORD = "hB&WZp$4LWWPFh"

FLATFINDER_URL = "https://flatfinder.bolls.dev/v1"


def fetch_listings(email, password):

    GET_PARAMS = dict(
        email=email,
        password=password,
    )
    print(GET_PARAMS)

    get_res = requests.get(url=FLATFINDER_URL + "/listings", params=GET_PARAMS)

    data = get_res.json()

    if data["ok"] != 1:
        raise f"error: GET {FLATFINDER_URL}/listings response not ok"

    listings = data["data"]

    return listings


# register our puppet accounts as sessions at the api
# for acc in puppet_accounts:
#     fetch_listings(acc["email"], acc["password"])


def get_casual_german_flat_application(listing):
    codeword = listing["codeWord"]

    return f"""
Moin {listing["publisher"]["name"]["rmmended"]},

{f"Codewort: {codeword} ;)" if codeword is not None else ""}
Ein Freund und ich suchen nach einer langfristigen Unterkunft, da unsere vorübergehenden Mietverträge demnächst auslaufen.
Die Wohnung würde uns sehr gelegen kommen, da sie sich in der Nähe unserer Uni befindet.

Wir sind beide für das Studium nach Berlin gezogen.
Da wir die meiste Zeit an der Uni sind, brauchen wir nur ein entspanntes Plätzchen zum Schlafen und sind ansonsten sehr unkompliziert :)

Auf Anfrage sind wir jederzeit bereit, Dokumente wie unsere Studentenverträge oder die SCHUFA-Einträge unserer Eltern zur Verfügung zu stellen.
Unsere Eltern können zudem für uns bürgen.
Mehr Informationen über uns findest du in unserem Gesuch.

Falls du Interesse hast, würden wir uns sehr über eine Antwort freuen :)

Mit freundlichen Grüßen
Linus Bolls
"""


def get_formal_german_flat_application(listing):
    codeword = listing["codeWord"]

    return f"""
Guten Tag {listing["publisher"]["name"]["recommended"]},

{f"Codewort: {codeword} ;)" if codeword is not None else ""}
Ein Freund und ich suchen nach einer langfristigen Unterkunft, da unsere vorübergehenden Mietverträge demnächst auslaufen.
Die Wohnung würde uns sehr gelegen kommen, da sie sich in der Nähe unserer Uni befindet.

Wir sind beide für das Studium nach Berlin gezogen.
Da wir die meiste Zeit an der Uni sind, brauchen wir nur ein entspanntes Plätzchen zum Schlafen und sind ansonsten sehr unkompliziert.

Auf Anfrage sind wir jederzeit bereit, Dokumente wie unsere Studentenverträge oder die SCHUFA-Einträge unserer Eltern zur Verfügung zu stellen.
Unsere Eltern können zudem für uns bürgen.
Mehr Informationen über uns finden Sie in unserem Gesuch.

Falls Sie Interesse haben, würden wir uns sehr über eine Antwort freuen :)

Mit freundlichen Grüßen
Linus Bolls
"""


def get_english_flat_application(listing):
    codeword = listing["codeWord"]

    return f"""
Hi {listing["publisher"]["name"]["recommended"]},

{f"Codeword: {codeword} ;)" if codeword is not None else ""}
A friend of mine and myself are looking for a long-term accommodation.
The flat would be perfect for us, and it's close to our uni!

We both moved to Berlin to study, and spend most of our time at the uni.
We just need a cozy place to sleep and relax and are very uncomplicated tenants.

On request we will send you further documents, like the SCHUFA of our parents and our prove of study.

Looking forward to hearing from you :)

Regards,
Linus Bolls
"""


def get_german_wg_application(listing):
    return None

    codeword = listing["codeWord"]

    return f"""
Moin {listing["publisher"]["name"]["recommended"]},

{f"Codewort: {codeword} ;)" if codeword is not None else ""}
Ein Freund und ich suchen nach einer langfristigen Unterkunft, da unsere vorübergehenden Mietverträge demnächst auslaufen.
Die Wohnung würde uns sehr gelegen kommen, da sie sich in der Nähe unserer Uni befindet.

Wir sind beide für das Studium nach Berlin gezogen.
Da wir die meiste Zeit an der Uni sind, brauchen wir nur ein entspanntes Plätzchen zum Schlafen und sind ansonsten sehr unkompliziert :)

Auf Anfrage sind wir jederzeit bereit, Dokumente wie unsere Studentenverträge oder die SCHUFA-Einträge unserer Eltern zur Verfügung zu stellen.
Unsere Eltern können zudem für uns bürgen.
Mehr Informationen über uns findest du in unserem Gesuch.

Falls du Interesse hast, würden wir uns sehr über eine Antwort freuen :)

Mit freundlichen Grüßen
Linus Bolls
"""


def get_english_wg_application(listing):
    return None


def get_application(listing):
    is_casual = listing["publisher"]["name"]["last"] is None

    if "german" in listing["languages"]:
        if listing["type"] in ["FLAT", "SINGLE_ROOM_FLAT"]:

            if is_casual:
                return get_casual_german_flat_application(listing)
            else:
                return get_formal_german_flat_application(listing)

        elif listing["type"] == "WG":

            return get_german_wg_application(listing)

    elif "english" in listing["languages"]:

        if listing["type"] in ["FLAT", "SINGLE_ROOM_FLAT"]:

            return get_english_flat_application(listing)

        elif listing["type"] == "WG":

            return get_english_wg_application(listing)

    return None


while True:

    listings = fetch_listings(ACTIVE_EMAIL, ACTIVE_PASSWORD)

    for listing in listings:

        # listing["location"]["city"] is "Berlin"
        if not listing["userHasApplied"] and listing["endDate"] is None and listing["type"] in ["FLAT", "SINGLE_ROOM_FLAT", "WG"]:

            application = get_application(listing)

            if application != None:

                # POST_NOTE_PARAMS = {
                #     "email": EMAIL,
                #     "password": PASSWORD,
                #     "listingId": listing["id"],
                #     "text": application,
                # }
                # post_res = requests.post(
                #     url=FLATFINDER_URL + "/notes",
                #     json=POST_NOTE_PARAMS,
                # )

                POST_APPLICATION_PARAMS = {
                    "email": ACTIVE_EMAIL,
                    "password": ACTIVE_PASSWORD,
                    "listingId": listing["id"],
                    "messages": [application],
                    "attachedListingId": "9815570",
                    "quitIfExistingConversation": True
                }
                post_res = requests.post(
                    url=FLATFINDER_URL + "/applications",
                    json=POST_APPLICATION_PARAMS,
                )

                listing_url = listing["url"]

                if post_res.status_code == 201:
                    playsound("/Users/linusbolls/downloads/long_ding.mp3")

                    print(f"applied to {listing_url}")

                elif post_res.status_code == 200:
                    print(
                        f"did not apply to {listing_url} because there is an existing conversation")

                else:
                    print(f"error applying to {listing_url}",
                          post_res.status_code)

    sleep(30)

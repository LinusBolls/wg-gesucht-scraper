import requests
from time import sleep

# email addresses not ending in @code.berlin or not
# both registered and confirmed at https://wg-gesucht.de will get rejected
EMAIL = "linus.bolls@gmail.com"
PASSWORD = "hB&WZp$4LWWPFh"

FLATFINDER_URL = "https://flatfinder.bolls.dev/v1"

while True:

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

        # listing["location"]["city"] is "Berlin"
        if not listing["userHasApplied"] and listing["endDate"] is None:

            codeword = listing["codeWord"]

            is_casual = listing["publisher"]["name"]["last"] is None

            ansprache = "du" if is_casual else "Sie"

            if "german" in listing["languages"]:

                application = f"""
{"Moin" if is_casual else "Guten Tag"} {listing["publisher"]["name"]["recommended"]},

{f"Codewort: {codeword} ;)" if codeword is not None else ""}
Ein Freund und ich suchen nach einer langfristigen Unterkunft, da unsere vorübergehenden Mietverträge demnächst auslaufen. 
Die Wohnung würde uns sehr gelegen kommen, da sie sich in der Nähe unserer Uni befindet.

Wir sind beide für das Studium nach Berlin gezogen.
Da wir die meiste Zeit an der Uni sind, brauchen wir nur ein entspanntes Plätzchen zum Schlafen und sind ansonsten sehr unkompliziert{" :)" if is_casual else "."}

Auf Anfrage sind wir jederzeit bereit, Dokumente wie unsere Studentenverträge oder die SCHUFA-Einträge unserer Eltern zur Verfügung zu stellen. 
Unsere Eltern können zudem für uns bürgen. 
Mehr Informationen über uns {"findest du" if is_casual else "finden Sie"} in unserem Gesuch.

Falls {"du Interesse hast" if is_casual else "Sie Interesse haben"}, würden wir uns sehr über eine Antwort freuen :)

Mit freundlichen Grüßen
Linus Bolls
                """

            else:

                application = f"""
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
                "email": EMAIL,
                "password": PASSWORD,
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
                print(f"applied to {listing_url}")

            elif post_res.status_code == 200:
                print(
                    f"did not apply to {listing_url} because there is an existing conversation")

            else:
                print(f"error applying to {listing_url}", post_res)

            sleep(30)

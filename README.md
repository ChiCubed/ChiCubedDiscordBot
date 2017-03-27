# ChiCubedDiscordBot
A discord bot for me to play with.

Put the token in a JSON file named `token.json` in the root directory.
This should have an attribute named 'bottoken', and possibly an attribute
named 'googletoken' and 'googlecx' for the API key and search engine key
respectively for the Google Custom Search API. It may also have a token
for the WolframAlpha API.

{
  "bottoken": "12345",
  "googletoken": "67890",
  "googlecx": "aeiou",
  "wolframtoken": "awefa"
}

responses.db contains a database of responses delimited by :: and ;;, as
follows:

Example::Example2;;
Test(.*)::\3;;

The responses are in [Python regex](https://docs.python.org/3.6/library/re.html) format.
\1 is a group representing the username and \2 is a group containing the user ID.

The responses all start from the beginning and end at the end of the
messages.

The bot listens for messages which match the regexes on the left side
and responds to them with those on the right side. (At least it will eventually,
at the moment use the `!testresponse` command to test your responses)

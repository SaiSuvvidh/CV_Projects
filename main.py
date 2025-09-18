import sys 

def main():
    print("Welcome to CV Table Tennis 🏓")
    print("Select Game Mode:")
    print("1. Single Player (vs Computer)")
    print("2. Multiplayer (Offline, same camera)")
    print("3. Multiplayer (Online via network)")
    print("   a) Host a game")
    print("   b) Join a game")

    choice = input("Enter your choice (1/2/3): ")

    if choice == "1":
        import singleplayer
        singleplayer.run()

    elif choice == "2":
        import multiplayer_offline
        multiplayer_offline.run()

    elif choice == "3":
        print("You selected Online Multiplayer 🌐")
        sub_choice = input("Do you want to host (h) or join (j)? ")

        from multiplayer_online import host_game, join_game
        if sub_choice.lower() == "h":
            host_game()
        elif sub_choice.lower() == "j":
            join_game()
        else:
            print("Invalid option for online multiplayer, exiting...")
            sys.exit()

    else:
        print("Invalid choice, exiting...")
        sys.exit()

if __name__ == "__main__":
    main()

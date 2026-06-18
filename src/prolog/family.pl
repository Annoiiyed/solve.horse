% Family relations: who is whose grandparent.

parent(tom, bob).
parent(bob, ann).
parent(bob, pat).

grandparent(X, Z) :-
    parent(X, Y),
    parent(Y, Z).
